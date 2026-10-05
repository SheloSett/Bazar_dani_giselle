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
scripts/backup.sh      backup de la base y las fotos (correrlo por cron en el VPS)
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
src/app/imprimir/      catálogo entero para imprimir o guardar en PDF
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

### Orden del catálogo

El catálogo muestra los rubros y los productos en el orden del panel. Las flechas
⬆/⬇ de **Categorías** ordenan los rubros (tiles y pestañas), y las de la tabla de
**Productos** mueven cada producto dentro de su rubro. Los productos sin stock van
igual al final de su rubro.

## Ajustes del negocio

En **Ajustes** se cambian el nombre, el WhatsApp donde llegan los pedidos (se valida
y se guarda solo con dígitos), el título y el texto de la portada, y los tres
**beneficios** de la franja con íconos ("Envío en el día", etc.): cada uno tiene
título y aclaración, y el que queda sin título no se muestra.

## Logo

En **Ajustes → Logo** se sube la imagen del negocio (JPG, PNG, WebP o AVIF; lo ideal
es un PNG con fondo transparente, más ancho que alto). Cuando hay logo, reemplaza al
nombre en el encabezado del catálogo y de los pedidos, y aparece en el catálogo para
imprimir; el pie sigue mostrando el nombre como texto. Pasa por el mismo procesado
que las fotos, y al cambiarlo o quitarlo se borra el archivo anterior.

El ícono de la pestaña del navegador (`/icono.png`) sale del logo; si no hay logo,
es un ícono genérico con el verde del sitio.

## Catálogo en PDF

Desde el panel, **Catálogo en PDF** abre `/imprimir`: el catálogo entero (solo los
productos visibles) en una página pensada para papel, agrupado por rubro con foto,
precio, oferta y descripción. Con "Imprimir o guardar PDF" el navegador lo imprime
o lo guarda como PDF, listo para mandar por WhatsApp. Lleva la fecha del día: los
precios son los del momento en que se genera.

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
- Reenviar el mismo pedido no lo duplica: el mismo carrito con los mismos datos
  reusa el mismo link (aunque se recargue la página), y además el servidor no
  guarda dos veces el mismo teléfono con exactamente los mismos productos y
  cantidades dentro de las 24 horas.
- Cada pedido tiene su estado en el panel: **Pendiente / Confirmado** (con la fecha
  de confirmación guardada, para contar más adelante cuántos terminaron en venta), y
  un tachito para eliminarlo directo desde la lista.
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
# en el VPS (el deploy actual está en /home/shelo/Bazar_dani_giselle)
git clone <repo>          # crea la carpeta Bazar_dani_giselle
cd Bazar_dani_giselle

# crear .env solo con las claves (docker-compose las inyecta y no
# arranca si faltan):
#   ADMIN_PASSWORD=una-clave-segura
#   SESSION_SECRET=<salida de: openssl rand -hex 32>

docker compose up -d --build
```

La app queda escuchando en `127.0.0.1:3010`, o sea solo dentro del VPS: desde afuera
se entra por un proxy que le pone HTTPS (ver "Publicarla con Caddy" más abajo). Para
probarla sin proxy alcanza con `curl http://localhost:3010` en el servidor.
Las migraciones corren solas al arrancar. Fotos y base quedan en volúmenes
(`uploads`, `pgdata`), sobreviven a rebuilds.

En producción `ADMIN_PASSWORD` tiene que tener al menos 8 caracteres: con una más
corta el login no deja entrar y avisa por qué.

Postgres se publica solo en `127.0.0.1:5433` (para desarrollo local): desde
afuera del VPS no se llega. En el VPS se puede borrar ese bloque `ports`.

El login del panel admite 5 intentos fallidos por IP y 30 en total cada
15 minutos.

**Si ya había un deploy anterior:** la app ahora corre con el usuario `node`
(no root) y el volumen de fotos existente es de root. Arreglarlo una vez con:

```bash
docker compose run --rm -u root app chown -R node:node /app/uploads
```

### Backups

`scripts/backup.sh` guarda la base (`pg_dump`) y las fotos (`uploads/`) en
`backups/`, y borra lo que tenga más de 14 días (`BACKUP_KEEP_DAYS` lo cambia).
Para que corra solo todas las noches, en el VPS (`crontab -e`):

```
0 4 * * * cd /home/shelo/Bazar_dani_giselle && mkdir -p backups && ./scripts/backup.sh >> backups/backup.log 2>&1
```

La ruta es la carpeta del proyecto en el VPS (cambiarla si está en otro lado). El
`mkdir -p backups` va antes porque el log se abre antes de que corra el script: sin
la carpeta, cron no llega a ejecutarlo y no avisa. `backups/` está fuera de git y
del build de Docker (`.gitignore` y `.dockerignore`): tiene datos de clientes.

Conviene bajarse la carpeta `backups/` cada tanto (o copiarla a otro lado), por si
se pierde el VPS entero. Para restaurar:

```bash
gunzip -c backups/db-FECHA.sql.gz | docker compose exec -T db psql -U bazar bazar
docker compose exec -T app tar -xzf - -C /app < backups/uploads-FECHA.tgz
```

### Publicarla con Caddy

Con Caddy instalado en el mismo servidor:

```
catalogo.ejemplo.com {
    reverse_proxy localhost:3010
}
```

Si Caddy corre en un contenedor (como en el VPS actual, donde es el contenedor
`proxy` y cada sitio tiene su archivo en `/srv/proxy/sites/`), no llega a
`localhost`: hay que sumar la app a la red de Docker del proxy con un
`docker-compose.override.yml` al lado del compose (no va a git) y apuntar al contenedor:

```yaml
services:
  app:
    networks: [default, edge]
networks:
  edge:
    external: true
```

```
catalogo.ejemplo.com {
    encode zstd gzip
    reverse_proxy bazar_dani_giselle-app-1:3000
}
```

Caddy saca el certificado solo. La cookie de sesión se marca `secure` cuando el
pedido llega por HTTPS, y el límite de intentos del login usa la IP real que manda
el proxy.

## Seguridad

- Todas las respuestas llevan cabeceras de seguridad (`next.config.mjs`): política de
  contenido que solo permite recursos del propio sitio, no se puede embeber en otra
  página, y HTTPS obligatorio una vez que se entró por HTTPS.
- El optimizador de imágenes de Next (`/_next/image`) está cerrado: el sitio no lo
  usa y abierto permitía gastarle procesador y disco al servidor.
- Las rutas del panel que cambian algo solo aceptan pedidos que salen del propio
  sitio (`src/middleware.ts`), además de exigir la sesión.
- El login y el cambio de clave tienen tope de tamaño y de intentos (5 por IP y 30
  en total cada 15 minutos).
- Cada página del panel verifica la sesión por su cuenta, no solo el middleware.
- Al público no le llega el stock real por encima de 20 unidades
  (`PUBLIC_STOCK_CAP`), ni los rubros que no tienen productos visibles. Ese número es
  también el máximo de un mismo producto por pedido.

## Mejoras pendientes

<!-- Hechas el 2026-10-02 (quedan comentadas como registro, no borradas):
- Exportar catálogo en PDF desde los mismos datos → página /imprimir, link "Catálogo en PDF" en el panel
- Orden manual de productos y categorías (campo `position` ya existe) → flechas en Productos y Categorías
- Backup automático de la base (`pg_dump`) y de `uploads/` → scripts/backup.sh + cron
-->

Por ahora no queda ninguna pendiente.
