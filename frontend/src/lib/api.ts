import { cookies } from "next/headers";
import { pedirJson, type Respuesta } from "./http";

// Cliente de la API para los COMPONENTES DE SERVIDOR.
//
// En el servidor no hay origin: una URL relativa no se puede resolver, así que
// acá se arma la absoluta contra BACKEND_URL. Y como el pedido sale del server
// de Next y no del browser, la cookie de sesión hay que reenviarla a mano.
//
// Este archivo es PEGAMENTO: lee la cookie, arma la URL y delega. Cómo se
// interpreta la respuesta vive en http.ts, que se testea sin Next.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export type { Respuesta };

export async function apiGet<T>(path: string): Promise<Respuesta<T>> {
  const cookieHeader = (await cookies()).toString();
  return pedirJson<T>(`${BACKEND_URL}${path}`, cookieHeader);
}
