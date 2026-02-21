# Supabase Skill — FoodIME

> Consulte este documento antes de qualquer operação de banco de dados:
> migrations, queries Prisma, políticas RLS, uploads de imagem ou uso do Realtime.

---

## 1. Configuração da Conexão

### Backend (Prisma)
```typescript
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

O `DATABASE_URL` no `.env` aponta para o connection pooler do Supabase (porta 6543):
```
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Para migrations (Prisma migrate), usar a conexão direta (porta 5432):
```
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

No `schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 2. Padrões de Query com Prisma

### Buscas comuns
```typescript
// Buscar loja com produtos disponíveis e em estoque
const store = await this.prisma.store.findUniqueOrThrow({
  where: { id: storeId },
  include: {
    products: {
      where: { isAvailable: true, stockQty: { gt: 0 } },
      orderBy: { name: 'asc' },
    },
  },
});

// Listar vendedores com loja aberta
const activeStores = await this.prisma.store.findMany({
  where: { isOpen: true },
  include: { owner: { select: { name: true, phone: true } } },
  orderBy: { name: 'asc' },
});

// Histórico de pedidos do comprador
const orders = await this.prisma.order.findMany({
  where: { buyerId: userId },
  include: {
    store: { select: { name: true, imageUrl: true } },
    items: {
      include: { product: { select: { name: true } } },
    },
    payment: { select: { method: true, status: true, grossAmount: true } },
  },
  orderBy: { createdAt: 'desc' },
});
```

### Transação atômica de pedido (crítica)
```typescript
// Decremento de estoque + atualização de status em uma única transação
async confirmOrder(orderId: string) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    // Verificar e decrementar estoque de cada item
    for (const item of order.items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
      });

      if (product.stockQty < item.quantity) {
        throw new ConflictException(
          `Estoque insuficiente para "${product.name}"`
        );
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQty: { decrement: item.quantity },
          isAvailable: product.stockQty - item.quantity > 0,
        },
      });
    }

    // Atualizar status do pedido
    return tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });
  });
}
```

### Métricas do vendedor
```typescript
// Receita por período
async getSellerMetrics(storeId: string, period: 'day' | 'week' | 'month') {
  const startDate = {
    day: subDays(new Date(), 1),
    week: subDays(new Date(), 7),
    month: subDays(new Date(), 30),
  }[period];

  const result = await this.prisma.payment.aggregate({
    where: {
      order: { storeId },
      status: 'PAID',
      createdAt: { gte: startDate },
    },
    _sum: { netAmount: true, grossAmount: true, commission: true },
    _count: { id: true },
  });

  return {
    revenue: result._sum.netAmount ?? 0,
    gross: result._sum.grossAmount ?? 0,
    commission: result._sum.commission ?? 0,
    orderCount: result._count.id,
  };
}

// Produto mais vendido
async getBestSeller(storeId: string) {
  const result = await this.prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { storeId, status: 'PAID' } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 1,
  });

  if (!result.length) return null;

  return this.prisma.product.findUnique({
    where: { id: result[0].productId },
  });
}
```

---

## 3. Migrations com Supabase MCP

### Fluxo de migration
```bash
# 1. Editar schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name nome_da_migration

# 3. Aplicar em produção
npx prisma migrate deploy

# 4. Verificar via Supabase MCP se as tabelas foram criadas corretamente
```

### Ao usar o Supabase MCP diretamente:
- Sempre verificar se a migration foi aplicada antes de escrever código que depende dela
- Usar o MCP para inspecionar o schema real do banco quando houver dúvida
- Após cada migration, habilitar RLS na(s) nova(s) tabela(s) imediatamente

---

## 4. Políticas RLS (Row Level Security)

**Regra geral:** toda tabela tem RLS habilitado. Sem exceção.

### Habilitar RLS em todas as tabelas
```sql
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
```

### Políticas por tabela

**User**
```sql
-- Usuário lê apenas seus próprios dados
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

-- Admin lê tudo
CREATE POLICY "admin_select_all_users" ON "User"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role = 'ADMIN')
  );
```

**Store**
```sql
-- Qualquer usuário autenticado pode listar lojas abertas
CREATE POLICY "stores_select_active" ON "Store"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Vendedor gerencia apenas sua própria loja
CREATE POLICY "seller_manage_own_store" ON "Store"
  FOR ALL USING (auth.uid()::text = "ownerId");
```

**Product**
```sql
-- Compradores leem produtos disponíveis de qualquer loja
CREATE POLICY "products_select_available" ON "Product"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Vendedor gerencia apenas produtos da sua loja
CREATE POLICY "seller_manage_own_products" ON "Product"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Store"
      WHERE id = "Product"."storeId" AND "ownerId" = auth.uid()::text
    )
  );
```

**Order**
```sql
-- Comprador vê seus próprios pedidos
CREATE POLICY "buyer_select_own_orders" ON "Order"
  FOR SELECT USING (auth.uid()::text = "buyerId");

-- Vendedor vê pedidos da sua loja
CREATE POLICY "seller_select_store_orders" ON "Order"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Store"
      WHERE id = "Order"."storeId" AND "ownerId" = auth.uid()::text
    )
  );
```

**Nota:** as políticas RLS do Supabase são uma segunda camada de segurança. A primeira camada são os guards do NestJS. Ambas devem estar ativas.

---

## 5. Supabase Storage — Upload de Imagens

### Buckets necessários
```
products-images/   ← fotos dos produtos (público)
store-images/      ← fotos de perfil das lojas (público)
```

### Criar buckets via Supabase MCP
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('products-images', 'products-images', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true);
```

### Política de storage
```sql
-- Qualquer um pode ler (bucket público)
CREATE POLICY "public_read_products" ON storage.objects
  FOR SELECT USING (bucket_id = 'products-images');

-- Apenas vendedor autenticado pode fazer upload
CREATE POLICY "seller_upload_products" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products-images' AND auth.role() = 'authenticated'
  );
```

### Upload via backend NestJS
```typescript
// No service, usar o cliente Supabase admin para uploads
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key, não anon key
);

async uploadProductImage(file: Express.Multer.File, productId: string) {
  const fileName = `${productId}-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('products-images')
    .upload(fileName, file.buffer, { contentType: 'image/jpeg' });

  if (error) throw new InternalServerErrorException('Falha no upload');

  const { data: urlData } = supabase.storage
    .from('products-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

---

## 6. Supabase Realtime

O Realtime é usado **apenas no mobile do vendedor** para receber pedidos em tempo real como fallback do Socket.io. A fonte primária de tempo real é o Socket.io no NestJS.

### Configuração no mobile
```typescript
// hooks/useRealtimeOrders.ts
import { useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useRealtimeOrders(storeId: string, onNewOrder: (order: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`orders:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Order',
          filter: `storeId=eq.${storeId}`,
        },
        (payload) => onNewOrder(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId]);
}
```

### Habilitar Realtime para a tabela Order
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
```

---

## 7. Checklist antes de aplicar uma migration

- [ ] Schema Prisma foi revisado e está correto?
- [ ] `prisma migrate dev` rodou sem erros localmente?
- [ ] RLS foi habilitado na(s) nova(s) tabela(s)?
- [ ] Políticas RLS foram criadas para todos os perfis?
- [ ] Supabase MCP confirmou que as tabelas existem com as colunas corretas?
- [ ] Buckets de storage foram criados se a migration inclui entidade com imagem?
