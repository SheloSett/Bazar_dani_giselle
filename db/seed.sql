-- Datos de ejemplo para que el catálogo no arranque vacío.
-- Se cargan solo en una base nueva, sin productos, categorías ni ajustes
-- (lo controla scripts/migrate.mjs).

INSERT INTO categories (name, position) VALUES
  ('Mates y termos', 1),
  ('Cocina', 2),
  ('Mesa y vasos', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, description, price, category_id, position) VALUES
  ('Mate de calabaza forrado',    'Calabaza natural forrada en cuero ecológico, virola de acero. Curado listo para usar.', 12500, (SELECT id FROM categories WHERE name = 'Mates y termos'), 1),
  ('Bombilla pico de loro acero', 'Acero inoxidable quirúrgico, desarmable para limpiar. Filtro de resorte.',               6800, (SELECT id FROM categories WHERE name = 'Mates y termos'), 2),
  ('Termo acero 1 L pico cebador','Doble capa de acero, mantiene la temperatura 12 horas. Tapón cebador antigoteo.',       48900, (SELECT id FROM categories WHERE name = 'Mates y termos'), 3),
  ('Pava enlozada 1,5 L roja',    'Enlozado clásico con tapa, ideal para el mate de todos los días. Apta hornalla y vitro.',28900, (SELECT id FROM categories WHERE name = 'Cocina'), 1),
  ('Olla esmaltada 24 cm con tapa','Esmaltada por dentro y por fuera, 6 litros. Distribución pareja del calor.',           42000, (SELECT id FROM categories WHERE name = 'Cocina'), 2),
  ('Sartén antiadherente 26 cm',  'Triple capa antiadherente libre de PFOA, mango soft que no calienta.',                  31500, (SELECT id FROM categories WHERE name = 'Cocina'), 3),
  ('Fuente de horno vidrio 3 L',  'Vidrio templado apto horno, microondas y freezer. Con asas laterales.',                 19800, (SELECT id FROM categories WHERE name = 'Cocina'), 4),
  ('Tabla de algarrobo con mango','Madera de algarrobo maciza, lustre natural apto alimentos. 40 × 25 cm.',                16500, (SELECT id FROM categories WHERE name = 'Cocina'), 5),
  ('Set ×6 vasos vidrio labrado', 'Vidrio labrado estilo veneciano, 310 ml. Resistentes al uso diario.',                   14900, (SELECT id FROM categories WHERE name = 'Mesa y vasos'), 1),
  ('Copas de vino cristal ×6',    'Cristal fino soplado, 450 ml, apto lavavajillas. Caja para regalo.',                    22400, (SELECT id FROM categories WHERE name = 'Mesa y vasos'), 2),
  ('Juego de té porcelana ×12',   'Porcelana blanca con filete azul: 6 tazas con plato, tetera y lechera.',                58000, (SELECT id FROM categories WHERE name = 'Mesa y vasos'), 3),
  ('Platos playos loza ×6',       'Loza reforzada de uso diario, borde clásico. Aptos microondas.',                        26700, (SELECT id FROM categories WHERE name = 'Mesa y vasos'), 4);

INSERT INTO settings (key, value) VALUES
  ('shop_name',      'Bazar & Deco'),
  ('whatsapp_phone', '5491100000000'),
  ('tagline',        'Todo para la cocina y la mesa'),
  ('footer_note',    'Retiro en el local o envío en el día. Los precios se confirman al cotizar.')
ON CONFLICT (key) DO NOTHING;
