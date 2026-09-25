// Cómo se lee una respuesta de la API: qué es un éxito, qué es un error y qué
// pasa cuando el backend no contesta. Sin `next/headers` y sin `fetch` adentro.
//
// El traedor entra por PARÁMETRO. En producción le entra el `fetch` de verdad
// (ver api.ts); en el test le entra un doble. Antes esta lógica estaba adentro
// de `apiGet`, que empieza con `await cookies()`: no había forma de ejercitar
// los tres caminos sin un servidor y una request de Next de por medio.

export type Respuesta<T> = {
  status: number;
  data: T | null;
  error: string | null;
};

// La forma mínima de `fetch` que este módulo usa. Que sea un tipo propio y no
// `typeof fetch` es lo que permite que un doble de dos líneas lo cumpla.
export type Traer = (url: string, init: RequestInit) => Promise<Response>;

export async function pedirJson<T>(
  url: string,
  cookieHeader: string,
  traer: Traer = fetch
): Promise<Respuesta<T>> {
  let res: Response;

  try {
    res = await traer(url, {
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
