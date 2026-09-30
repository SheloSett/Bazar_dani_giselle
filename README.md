# Catálogo con pedidos por WhatsApp

Catálogo de productos con carrito que arma el pedido y lo envía por WhatsApp, más un
panel de administración para cargar productos con fotos. Pensado para imprimir un QR
que apunte siempre a la misma URL.

## Stack

- **Next.js 15** (React 19, App Router, output standalone)
- **PostgreSQL 16** en Docker (sin ORM: `pg` + SQL plano en `db/`)
- Fotos guardadas en disco (`uploads/`, volumen en Docker)
- Sesión de admin con cookie firmada (HMAC) — sin dependencias de auth externas

## Estructura

```
db/schema.sql          esquema (idempotente)
db/seed.sql            datos de ejemplo (solo si la base está vacía)
scripts/migrate.mjs    aplica schema + seed; corre al arrancar el contenedor
src/middleware.ts      protege /admin con la cookie de sesión
src/lib/               db, auth, queries, manejo de uploads
src/app/page.tsx       catálogo público (server component)
src/components/Catalog.tsx   carrito, búsqueda, filtros, WhatsApp (client)
src/app/admin/         panel: login, productos, fotos, ajustes
src/app/api/admin/     API del panel (login, CRUD, uploads)
src/app/uploads/[...file]/   sirve las fotos subidas
```

## Desarrollo local

```bash
cp .env.example .env        # revisar valores (la clave del admin sale de acá)
npm install
npm run db:up               # levanta solo Postgres en Docker
npm run db:init             # crea tablas y carga datos de ejemplo
npm run dev                 # http://localhost:3000  ·  panel: /admin
```

## Deploy en el VPS (sin dominio, para probar)

```bash
# en el VPS (ej: /srv/bazar-catalogo)
git clone <repo> /srv/bazar-catalogo   # o subir la carpeta por scp
cd /srv/bazar-catalogo

# crear .env solo con las claves (docker-compose las inyecta):
#   ADMIN_PASSWORD=una-clave-segura
#   SESSION_SECRET=un-secreto-largo-aleatorio

docker compose up -d --build
```

Queda accesible en `http://IP-DEL-VPS:3010` (catálogo) y `/admin` (panel).
Las migraciones corren solas al arrancar. Fotos y base quedan en volúmenes
(`uploads`, `pgdata`), sobreviven a rebuilds.

Si no se quiere exponer Postgres al exterior, borrar el bloque `ports` del
servicio `db` en `docker-compose.yml` (solo hace falta para desarrollo local).

### Cuando haya dominio (Caddy)

```
catalogo.ejemplo.com {
    reverse_proxy localhost:3010
}
```

Y en `src/app/api/admin/login/route.ts` activar `secure: true` en la cookie.

## Mejoras pendientes

- Redimensionar fotos al subirlas (`sharp`) para que el catálogo cargue liviano
- Exportar catálogo en PDF desde los mismos datos
- Orden manual de productos y categorías (campo `position` ya existe)
- Backup automático de la base (`pg_dump`) y de `uploads/`
