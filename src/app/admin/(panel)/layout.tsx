import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="adm-nav">
        <div className="adm-nav-in">
          <span className="brand">Administración</span>
          <Link href="/admin">Productos</Link>
          <Link href="/admin/settings">Ajustes</Link>
          <Link href="/" target="_blank">
            Ver catálogo
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit">Salir</button>
          </form>
        </div>
      </nav>
      <div className="adm">{children}</div>
    </>
  );
}
