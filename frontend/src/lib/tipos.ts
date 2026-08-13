// Tipos de lo que devuelve la API. El frontend no conoce Prisma: solo conoce
// el JSON del backend, donde las fechas viajan como string ISO.

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada";
export type Rol = "admin" | "jugador";

export type Cancha = {
  id: string;
  nombre: string;
};

export type ReservaAPI = {
  id: string;
  fecha: string;
  inicio: string; // ISO
  fin: string; // ISO
  estado: EstadoReserva;
  usuarioId: string;
  canchaId: string;
  cancha: Cancha;
  usuario: { nombre: string; email: string };
};

// Lo que consume el listado: plano y ya formateado, para que el filtro pueda
// comparar `fecha` con el valor de un <input type="date"> sin parsear nada.
export type ReservaDTO = {
  id: string;
  canchaId: string;
  canchaNombre: string;
  fecha: string; // YYYY-MM-DD
  inicio: string; // HH:mm
  fin: string; // HH:mm
  estado: EstadoReserva;
  usuarioEmail?: string; // solo en la vista admin
};

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};
