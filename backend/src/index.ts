import { createApp } from "./app";
import { assertEnv, getPort } from "./env";

// Validar la configuración ANTES de escuchar: si falta JWT_SECRET o
// DATABASE_URL preferimos que el container muera con un mensaje claro a que
// quede levantado y falle recién en el primer login.
assertEnv();

const port = getPort();

createApp().listen(port, () => {
  console.log(`Backend escuchando en http://0.0.0.0:${port}`);
});

// TODO: endpoint de salud con uptime
