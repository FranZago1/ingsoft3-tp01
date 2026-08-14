import { cookies } from "next/headers";

// Cliente de la API para los COMPONENTES DE SERVIDOR.
//
// ¿Por qué no un fetch("/api/...") relativo como en el navegador? Porque en el
// servidor no hay origin: una URL relativa no se puede resolver. Y el rewrite
// de next.config.ts solo actúa sobre pedidos que ENTRAN al server de Next, no
// sobre los que ese server hace por su cuenta. Así que acá vamos directo a
// BACKEND_URL (server → server, dentro de la red de Docker) reenviando la
// cookie de sesión del usuario. El navegador sigue sin ver nunca al backend.
//
// Los componentes de cliente sí usan fetch("/api/...") relativo y pasan por el
// rewrite. Ver decisiones.md.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export type Respuesta<T> = {
  status: number;
  data: T | null;
  error: string | null;
};

export async function apiGet<T>(path: string): Promise<Respuesta<T>> {
  const cookieHeader = (await cookies()).toString();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      // Datos de sesión: nunca cacheados.
      cache: "no-store",
    });
  } catch {
    // El backend no responde (todavía no arrancó, se cayó, mal BACKEND_URL).
    return { status: 503, data: null, error: "No se pudo contactar al backend." };
  }

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    return {
      status: res.status,
      data: null,
      error: cuerpo?.error ?? "Error al consultar la API.",
    };
  }

  return { status: res.status, data: (await res.json()) as T, error: null };
}
