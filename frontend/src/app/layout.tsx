import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSesion } from "@/lib/sesion";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "ReservaPadel",
  description: "Reservas de canchas de pádel",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Solo para decidir qué links mostrar. La autorización la hace el backend.
  const sesion = await getSesion();

  return (
    <html lang="es">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-4xl items-center justify-between p-4">
            <Link href="/" className="text-lg font-bold">
              🎾 ReservaPadel
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {sesion ? (
                <>
                  <Link href="/reservas" className="hover:underline">
                    Mis reservas
                  </Link>
                  <Link href="/reservas/nueva" className="hover:underline">
                    Nueva
                  </Link>
                  {sesion.rol === "admin" && (
                    <Link href="/admin/reservas" className="hover:underline">
                      Admin
                    </Link>
                  )}
                  <span className="text-gray-500">{sesion.email}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:underline">
                    Ingresar
                  </Link>
                  <Link href="/registro" className="hover:underline">
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}
