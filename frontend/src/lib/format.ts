import type { ReservaAPI, ReservaDTO } from "./tipos";

// Helpers de formato de fechas/horas. Puros, usables en server y cliente.
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function soloFecha(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function soloHora(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// La API devuelve las fechas como string ISO. Las pantallas trabajan con un
// DTO plano y ya formateado, así el componente de filtro puede comparar fechas
// con un simple === contra el valor de un <input type="date">.
export function aReservaDTO(r: ReservaAPI, incluirUsuario = false): ReservaDTO {
  const inicio = new Date(r.inicio);
  const fin = new Date(r.fin);
  return {
    id: r.id,
    canchaId: r.canchaId,
    canchaNombre: r.cancha.nombre,
    fecha: soloFecha(inicio),
    inicio: soloHora(inicio),
    fin: soloHora(fin),
    estado: r.estado,
    usuarioEmail: incluirUsuario ? r.usuario.email : undefined,
  };
}
