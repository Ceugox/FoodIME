-- ============================================================
-- RLS Policies — Sprint 3: Store e Product
-- Executar no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Habilitar RLS
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Store
-- ============================================================

-- Qualquer usuário autenticado pode ler lojas
CREATE POLICY "stores_select_active" ON "Store"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Vendedor gerencia apenas sua própria loja (INSERT, UPDATE, DELETE)
CREATE POLICY "seller_manage_own_store" ON "Store"
  FOR ALL USING (auth.uid()::text = "ownerId");

-- ============================================================
-- Product
-- ============================================================

-- Qualquer usuário autenticado pode ler produtos
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
