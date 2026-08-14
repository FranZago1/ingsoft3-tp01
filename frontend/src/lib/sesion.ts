import { cookies } from "next/headers";
import type { Sesion } from "./tipos";

// Lee quién está logueado para decidir QUÉ MUESTRA la navegación.
//
// Importante: esto NO es autorización. Decodifica el payload del JWT sin
// verificar la firma, solo para pintar el nav (mostrar el link "Admin", el
// email, el botón "Salir"). Cualquiera podría falsificar esa cookie y ver un
// link de más: al hacer click, el backend verifica la firma de verdad y
// responde 401/403. La autorización vive en el backend y solo ahí.
//
// Se hace así para no inventar un endpoint /api/auth/me, que está fuera de los
// endpoints definidos para el proyecto. Ver decisiones.md.

const COOKIE_NAME = "token";

export async function getSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(partes[1], "base64url").toString("utf8")
    );

    // Si el token ya venció, para el nav es como no tener sesión.
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
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
