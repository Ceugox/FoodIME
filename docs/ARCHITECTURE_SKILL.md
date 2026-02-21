# Architecture Skill — FoodIME

> Consulte este documento antes de criar qualquer arquivo, módulo ou componente novo.
> Ele define as convenções que devem ser seguidas em todo o projeto.

---

## 1. Visão Geral da Arquitetura

O projeto é um monorepo com três aplicações separadas:

```
foodime/
├── backend/     ← NestJS API (Node.js + TypeScript)
├── mobile/      ← React Native + Expo (TypeScript)
├── admin/       ← Next.js (TypeScript)
└── PROJECT_MASTER.md
```

Cada aplicação tem seu próprio `package.json`, `.env` e ciclo de deploy independente.

---

## 2. Convenções de Nomenclatura

### Arquivos e Pastas
- Pastas: `kebab-case` → `order-items/`, `push-notifications/`
- Arquivos TypeScript: `kebab-case` → `auth.service.ts`, `order-card.tsx`
- Componentes React: `PascalCase` no nome do componente, `kebab-case` no arquivo → arquivo `store-card.tsx` exporta `StoreCard`
- Telas (Screens): sempre sufixo `Screen` → `HomeScreen.tsx`, `CheckoutScreen.tsx`
- Hooks: prefixo `use` → `useAuth.ts`, `useCart.ts`, `useSocket.ts`
- Stores Zustand: sufixo `Store` → `authStore.ts`, `cartStore.ts`
- Services: sufixo `service` → `auth.service.ts`, `mercadopago.service.ts`
- Guards: sufixo `guard` → `jwt-auth.guard.ts`, `roles.guard.ts`
- DTOs: sufixo `dto` → `create-order.dto.ts`, `update-product.dto.ts`

### Variáveis e Funções
- `camelCase` para variáveis e funções
- `PascalCase` para tipos, interfaces e classes
- `UPPER_SNAKE_CASE` para constantes → `MAX_STOCK_WARNING = 10`
- Interfaces com prefixo `I` apenas quando necessário para diferenciar de classe → preferir `type` quando possível
- Enums em `PascalCase` com valores em `UPPER_SNAKE_CASE`

### Endpoints da API
- REST com `kebab-case` e substantivos no plural
- `GET /stores` → lista lojas
- `GET /stores/:id` → loja específica
- `POST /stores` → cria loja
- `PATCH /stores/:id` → atualiza parcialmente
- `DELETE /stores/:id` → deleta
- Ações que não são CRUD: `POST /stores/:id/open`, `POST /orders/:id/cancel`

---

## 3. Backend — Padrões NestJS

### Estrutura de um Módulo
Todo módulo segue esta estrutura obrigatória:

```
modules/produtos/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
└── dto/
    ├── create-product.dto.ts
    └── update-product.dto.ts
```

### Anatomy de um Controller
```typescript
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.findAll(user);
  }

  @Post()
  @Roles(Role.SELLER)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: UserPayload) {
    return this.productsService.create(dto, user);
  }
}
```

### Anatomy de um Service
```typescript
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, user: UserPayload) {
    // sempre buscar a store do usuário antes de criar produto
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { ownerId: user.id },
    });

    return this.prisma.product.create({
      data: { ...dto, storeId: store.id },
    });
  }
}
```

### Tratamento de Erros
- Usar exceções nativas do NestJS: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`
- Nunca retornar erros crus do Prisma para o cliente
- Sempre usar `findUniqueOrThrow` ou `findFirstOrThrow` ao invés de checar `null` manualmente

```typescript
// ✅ Correto
const product = await this.prisma.product.findUniqueOrThrow({
  where: { id },
});

// ❌ Evitar
const product = await this.prisma.product.findUnique({ where: { id } });
if (!product) throw new NotFoundException('Produto não encontrado');
```

### DTOs
- Usar `class-validator` para validação
- Usar `@IsOptional()` + `@IsString()` em campos opcionais
- `UpdateDto` sempre extends `PartialType(CreateDto)`

```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsInt()
  @Min(0)
  stockQty: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Respostas da API
- Sempre retornar objetos, nunca primitivos soltos
- Usar estrutura consistente:

```typescript
// Sucesso com dados
{ data: { ... } }

// Sucesso sem dados (ex: delete)
{ message: 'Produto removido com sucesso' }

// Erro (gerado automaticamente pelo NestJS exception filter)
{ statusCode: 404, message: 'Produto não encontrado', error: 'Not Found' }
```

---

## 4. Mobile — Padrões React Native

### Estrutura de uma Screen
```typescript
// screens/buyer/HomeScreen.tsx
export function HomeScreen() {
  // 1. hooks de estado (Zustand)
  // 2. hooks de dados (React Query)
  // 3. handlers
  // 4. render com loading/error states obrigatórios

  const { data, isLoading, isError } = useStores();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {/* conteúdo */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

### React Query — Padrões
```typescript
// hooks/useStores.ts
export function useStores() {
  return useQuery({
    queryKey: ['stores', 'active'],
    queryFn: () => storeService.getActiveStores(),
    staleTime: 30_000, // 30 segundos — lojas mudam com frequência
  });
}

// Para mutations (criar pedido, atualizar estoque):
export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, qty }: UpdateStockParams) =>
      productService.updateStock(productId, qty),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### Zustand — Padrões
```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### Axios — Configuração
```typescript
// services/api.ts
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
});

// Interceptor de request: injeta token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor de response: renova token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // lógica de refresh token
    }
    return Promise.reject(error);
  }
);
```

### Navegação — Padrões
```typescript
// navigation/RootNavigator.tsx
export function RootNavigator() {
  const user = useAuthStore((state) => state.user);

  if (!user) return <AuthNavigator />;
  if (user.role === 'SELLER') return <SellerNavigator />;
  return <BuyerNavigator />;
}
```

---

## 5. Admin — Padrões Next.js

- App Router (`app/` directory)
- Server Components por padrão, Client Components apenas quando necessário (`'use client'`)
- Proteção de rotas via middleware Next.js verificando role ADMIN
- Fetch de dados com `fetch` nativo do Next.js ou React Query no client
- UI: shadcn/ui para componentes base, Tremor para gráficos e dashboards

---

## 6. Constantes do Projeto

```typescript
// Definir em backend/src/common/constants.ts e importar onde necessário
export const STOCK_WARNING_THRESHOLD = 10; // badge "Últimas unidades"
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const DEFAULT_COMMISSION_PERCENT = 10; // % de comissão do app
```

---

## 7. Checklist antes de criar um arquivo novo

- [ ] O módulo/pasta já existe? Se sim, adicione ao existente
- [ ] Segui a convenção de nomenclatura?
- [ ] DTOs têm validação com class-validator?
- [ ] Screen tem loading e error state?
- [ ] Service usa PrismaService via injeção de dependência?
- [ ] Endpoint está protegido com JwtAuthGuard?
- [ ] Commitar via GitHub MCP após concluir
