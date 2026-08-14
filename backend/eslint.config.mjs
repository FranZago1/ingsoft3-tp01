// Config plana de ESLint 9 para el backend. Reglas recomendadas de JS + TypeScript.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Los parámetros con guion bajo son intencionalmente no usados. Express
      // los necesita igual: un error handler SOLO se reconoce como tal si
      // declara los cuatro argumentos (err, req, res, next).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
