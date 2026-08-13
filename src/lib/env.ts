// Lectura centralizada de variables de entorno.
// JWT_SECRET es obligatoria: si no está, la app falla apenas se usa el secret.

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "JWT_SECRET no está definida. La app no puede firmar ni verificar tokens."
    );
  }
  return secret;
}
