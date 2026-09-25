import { cookies } from "next/headers";
import { sesionDeToken } from "./token";
import type { Sesion } from "./tipos";

// Lee quién está logueado para decidir QUÉ MUESTRA la navegación.
//
// Este archivo es PEGAMENTO: lo único que hace es sacar la cookie del pedido.
// Toda la decisión —parsear el payload, mirar el vencimiento, normalizar el
// rol— vive en token.ts, que se testea sin Next. Ver decisiones.md.
//
// Se hace así para no inventar un endpoint /api/auth/me, que está fuera de los
// endpoints definidos para el proyecto.

const COOKIE_NAME = "token";

export async function getSesion(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return sesionDeToken(token, new Date());
}
