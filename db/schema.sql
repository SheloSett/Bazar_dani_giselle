-- Esquema del catálogo. Idempotente: se puede correr las veces que haga falta.

CREATE TABLE IF NOT EXISTS categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  position INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Precio en pesos argentinos, sin centavos
  price       INTEGER NOT NULL DEFAULT 0,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  visible     BOOLEAN NOT NULL DEFAULT TRUE,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_photos (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  position   INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_photos_product    ON product_photos(product_id);

-- Columnas agregadas después del esquema inicial (también idempotentes)
-- Precio anterior cuando el producto está en oferta (se muestra tachado); NULL si no
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price INTEGER;
-- Unidades disponibles; NULL = no se controla el stock (siempre disponible)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;
-- Foto propia del rubro en el catálogo; NULL = se usa la del primer producto
ALTER TABLE categories ADD COLUMN IF NOT EXISTS photo TEXT;

-- Pedidos armados en el catálogo. Se guardan al tocar "Enviar pedido por WhatsApp"
-- para que el mensaje lleve un link al detalle con fotos (/pedido/<token>).
-- No guardan datos de quien pide.
CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  -- Código del link: aleatorio, imposible de adivinar
  token      TEXT NOT NULL UNIQUE,
  total      INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nombre, precio y foto quedan copiados como estaban al pedir: si después cambia
-- o se borra el producto, el pedido sigue mostrando lo que se pidió
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  quantity   INTEGER NOT NULL,
  photo      TEXT,
  position   INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Quién hizo el pedido (obligatorios al pedir). Datos personales: se ven solo en el
-- panel, nunca en la página pública del pedido. El teléfono se guarda solo con dígitos.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name  TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
