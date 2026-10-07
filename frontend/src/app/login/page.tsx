"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validarLogin } from "@/lib/validacion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Comportamiento testeable #1: no se envía con datos inválidos.
  const valido = validarLogin({ email, password }).ok;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/reservas");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión.");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Ingresar</h1>
      <p className="mb-4 text-sm text-gray-600">Reservá tu cancha de pádel en segundos.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border p-2"
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          aria-label="Contraseña"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!valido}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          Ingresar
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="text-blue-600 hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
