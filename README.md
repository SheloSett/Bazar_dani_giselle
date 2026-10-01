# Catálogo con pedidos por WhatsApp

Catálogo de productos con carrito que arma el pedido y lo envía por WhatsApp, más un
panel de administración para cargar productos con fotos. Pensado para imprimir un QR
que apunte siempre a la misma URL.

## Stack

- **Next.js 15** (React 19, App Router, output standalone)
- **PostgreSQL 16** en Docker (sin ORM: `pg` + SQL plano en `db/`)
- Fotos guardadas en disco (`uploads/`, volumen en Docker), optimizadas al subir con
  `sharp`: rotación corregida, máximo 1200 px, WebP, sin metadatos, más una miniatura
  para la grilla
- Sesión de admin con cookie firmada (HMAC) — sin dependencias de auth externas

## Estructura

```
db/schema.sql          esquema (idempotente)
db/seed.sql            datos de ejemplo (solo en una base nueva)
scripts/migrate.mjs    aplica schema + seed; corre al arrancar el contenedor
scripts/reset-password.mjs   vuelve a la clave inicial del .env si se olvidó la del panel
src/middleware.ts      protege /admin con la cookie de sesión
src/lib/               db, auth, clave del admin, límite de intentos, queries, validación, uploads
src/app/page.tsx       catálogo público (server component)
src/components/Catalog.tsx   carrito, búsqueda, filtros, WhatsApp (client)
src/app/admin/         panel: login, productos, fotos, ajustes
src/app/api/admin/     API del panel (login, CRUD, uploads)
src/app/uploads/[...file]/   sirve las fotos subidas y sus miniaturas
src/app/og/[name]/     imagen JPEG para la vista previa al compartir el link
src/app/api/orders/    guarda el pedido al tocar "Enviar por WhatsApp" (ruta pública, con límites)
src/app/pedido/[token]/      detalle del pedido con fotos: el link que va en el mensaje
test/                  tests (npm test)
```

## Productos

Además de nombre, precio, categoría y fotos, cada producto tiene dos campos opcionales:

- **Precio anterior**: si se carga (y es mayor que el precio), el catálogo lo muestra
  tachado con el porcentaje de descuento.
- **Stock**: vacío = no se controla. Con 0 el producto aparece como "Sin stock" (se
  puede consultar pero no sumar al pedido); con 3 o menos avisa que quedan pocas
  unidades. El pedido nunca supera las unidades disponibles.

La búsqueda ignora tildes y mayúsculas ("cafe" encuentra "Cafetera").

## Compartir el link

Al compartir la URL por WhatsApp, Instagram, etc. aparece una vista previa con el
nombre del negocio, el título y la primera foto del catálogo (servida en JPEG desde
`/og/…`, porque WhatsApp no muestra WebP). Si el sitio está detrás de un proxy que
no manda `X-Forwarded-Host`/`X-Forwarded-Proto`, configurar `SITE_URL` en el `.env`.

## Pedidos

WhatsApp no deja adjuntar fotos desde un link, así que el mensaje del pedido lleva un
link al detalle: `…/pedido/<código>`. Al tocar "Enviar pedido por WhatsApp" el sitio
guarda el pedido (tablas `orders` y `order_items`) y esa página lo muestra con la foto
de cada producto, cantidades y total, con un botón para imprimirlo o guardarlo en PDF.

Para pedir hay que dejar **nombre y teléfono** (obligatorios: sin eso no se envía, y
el servidor también los exige). Todos los pedidos quedan en el panel, en **Pedidos**:
lista con cliente, teléfono y total, y un detalle con fotos, botón para escribirle al
cliente por WhatsApp, imprimir o eliminar.

- El código del link es aleatorio: solo lo ve quien tiene el mensaje. No se indexa.
- El nombre y el teléfono del cliente se ven solo en el panel; la página del link no
  los muestra.
- Se guarda nombre, precio y foto de cada producto como estaban al pedir; si el
  producto cambia después, el pedido no. Los precios los pone el servidor.
- El pedido se guarda al tocar el botón: si la persona después no manda el mensaje,
  queda igual en la lista. No descuenta stock: sigue siendo un pedido a confirmar.
- Si el guardado falla, el catálogo avisa y el mensaje igual lleva el detalle en texto.
- Límites de la ruta pública: cuerpo de 20 KB, 100 productos, 12 pedidos por IP y 240
  en total cada 10 minutos.

## Desarrollo local

```bash
cp .env.example .env        # completar ADMIN_PASSWORD y SESSION_SECRET
npm install
npm run db:up               # levanta solo Postgres en Docker
npm run db:init             # crea tablas y carga datos de ejemplo
npm run dev                 # http://localhost:3000  ·  panel: /admin
```

Para generar `SESSION_SECRET`: `openssl rand -hex 32` (mínimo 32 caracteres).

Antes de subir cambios: `npm run lint && npm test`.

## Clave del panel

Se entra a `/admin` con `ADMIN_PASSWORD` del `.env` solo la primera vez. Desde
**Ajustes → Clave del panel** se cambia sin tocar el servidor: queda guardada
hasheada en la base y la del `.env` deja de valer. Cambiarla cierra las sesiones
abiertas en otros dispositivos.

Si se olvida la clave, vuelve a valer la del `.env` con:

```bash
docker compose exec app node scripts/reset-password.mjs   # en el VPS
npm run admin:reset                                        # en local
```

## Deploy en el VPS (sin dominio, para probar)

```bash
# en el VPS (ej: /srv/bazar-catalogo)
git clone <repo> /srv/bazar-catalogo   # o subir la carpeta por scp
cd /srv/bazar-catalogo

# crear .env solo con las claves (docker-compose las inyecta y no
# arranca si faltan):
#   ADMIN_PASSWORD=una-clave-segura
#   SESSION_SECRET=<salida de: openssl rand -hex 32>

docker compose up -d --build
```

Queda accesible en `http://IP-DEL-VPS:3010` (catálogo) y `/admin` (panel).
Las migraciones corren solas al arrancar. Fotos y base quedan en volúmenes
(`uploads`, `pgdata`), sobreviven a rebuilds.

Postgres se publica solo en `127.0.0.1:5433` (para desarrollo local): desde
afuera del VPS no se llega. En el VPS se puede borrar ese bloque `ports`.

El login del panel admite 5 intentos fallidos por IP y 30 en total cada
15 minutos.

**Si ya había un deploy anterior:** la app ahora corre con el usuario `node`
(no root) y el volumen de fotos existente es de root. Arreglarlo una vez con:

```bash
docker compose run --rm -u root app chown -R node:node /app/uploads
```

### Cuando haya dominio (Caddy)

```
catalogo.ejemplo.com {
    reverse_proxy localhost:3010
}
```

La cookie de sesión se marca `secure` sola cuando el pedido llega por HTTPS
(Caddy manda `X-Forwarded-Proto`). Con Caddy delante conviene cambiar el
`3010:3000` por `127.0.0.1:3010:3000` para que no se pueda entrar salteando HTTPS.

## Mejoras pendientes

- Exportar catálogo en PDF desde los mismos datos
- Orden manual de productos y categorías (campo `position` ya existe)
- Backup automático de la base (`pg_dump`) y de `uploads/`
