"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validarRegistro } from "@/lib/validacion";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Comportamiento testeable #1: validación pura → mensajes + botón deshabilitado.
  const validacion = validarRegistro({ nombre, email, password });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password }),
    });
    if (res.ok) {
      router.push("/reservas");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo registrar.");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Registrarse</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border p-2"
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="Contraseña (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!validacion.ok && (nombre || email || password) && (
          <p className="text-sm text-amber-600">{validacion.error}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!validacion.ok}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          Crear cuenta
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
