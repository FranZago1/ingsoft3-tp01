import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy de /api/* hacia el backend.
//
// ¿Por qué acá y no con el `rewrites()` de next.config.ts, que sería lo obvio?
// Porque Next resuelve los rewrites EN EL BUILD: el destino queda escrito en
// .next/routes-manifest.json y el next.config.js ni siquiera viaja en la
// imagen. Con `output: "standalone"` eso se comprueba a ojo. Resultado: la
// imagen quedaría atada al backend que estuviera configurado el día que se
// compiló, y BACKEND_URL en runtime no haría nada. Rompe el principio de una
// misma imagen configurable por entorno, que es todo el punto del TP.
//
// El middleware, en cambio, corre en CADA pedido, así que lee la variable
// cuando el contenedor ya está andando: la misma imagen sirve para el compose
// (BACKEND_URL=http://backend:8080) y para cualquier otro entorno.
//
// Sigue sin haber lógica de negocio en el frontend: esto solo reenvía.
export function middleware(req: NextRequest) {
  const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
  const destino = new URL(req.nextUrl.pathname + req.nextUrl.search, backend);
  return NextResponse.rewrite(destino);
}

export const config = {
  matcher: "/api/:path*",
};
