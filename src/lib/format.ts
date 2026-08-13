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
