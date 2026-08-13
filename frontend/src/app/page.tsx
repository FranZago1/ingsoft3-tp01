import { redirect } from "next/navigation";
import { getSesion } from "@/lib/sesion";

// La raíz no tiene contenido propio: manda a las reservas o al login.
export default async function Home() {
  const sesion = await getSesion();
  redirect(sesion ? "/reservas" : "/login");
}
