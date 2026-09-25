import type { Sesion } from "./tipos";

// Decodifica el payload de un JWT para saber QUÉ MUESTRA la navegación.
//
// Importante: esto NO es autorización. No verifica la firma. Cualquiera podría
// falsificar la cookie y ver un link de más: al hacer click, el backend
// verifica la firma de verdad y responde 401/403. La autorización vive en el
// backend y solo ahí.
//
// `ahora` entra por parámetro —no se llama a Date.now() adentro— para que el
// chequeo de vencimiento sea determinista en un test.

export function sesionDeToken(
  token: string | undefined,
  ahora: Date
): Sesion | null {
  if (!token) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(partes[1], "base64url").toString("utf8")
    );

    // Si el token ya venció, para el nav es como no tener sesión.
    if (typeof payload.exp === "number" && payload.exp * 1000 < ahora.getTime()) {
      return null;
    }
    if (!payload.sub) return null;

    return {
      id: payload.sub,
      nombre: payload.nombre ?? "",
      email: payload.email ?? "",
      rol: payload.rol === "admin" ? "admin" : "jugador",
    };
  } catch {
    return null;
  }
}
