// Lectura centralizada de variables de entorno del backend.
// Regla del proyecto: NADA hardcodeado. DATABASE_URL y JWT_SECRET son
// obligatorias y la app FALLA AL ARRANCAR si no están.

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "JWT_SECRET no está definida. La app no puede firmar ni verificar tokens."
    );
  }
  return secret;
}

// Puerto del server. Por defecto 8080 (el que publica el compose).
export function getPort(): number {
  const raw = process.env.PORT;
  if (!raw) return 8080;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT inválido: "${raw}".`);
  }
  return port;
}

// Se llama una sola vez al arrancar (index.ts): preferimos fallar temprano y
// ruidosamente antes que quedar escuchando en un estado inseguro o sin base.
export function assertEnv(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL no está definida. Es la única fuente de conexión a la base."
    );
  }
  getJwtSecret();
  getPort();
}
