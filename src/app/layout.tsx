import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
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
  const user = await getCurrentUser();

  return (
    <html lang="es">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-4xl items-center justify-between p-4">
            <Link href="/" className="text-lg font-bold">
              🎾 ReservaPadel
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/reservas" className="hover:underline">
                    Mis reservas
                  </Link>
                  <Link href="/reservas/nueva" className="hover:underline">
                    Nueva
                  </Link>
                  {user.rol === "admin" && (
                    <Link href="/admin/reservas" className="hover:underline">
                      Admin
                    </Link>
                  )}
                  <span className="text-gray-500">{user.email}</span>
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
