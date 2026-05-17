
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormInput from "@/app/components/ui/form-input";
import FormButton from "@/app/components/ui/form-button";
import FormAlert from "@/app/components/ui/form-alert";
import AuthCard from "@/app/components/ui/auth-card";

export default function Page() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Completa correo y contraseña");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "No se pudo iniciar sesión");
      }

      await res.json();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16 py-12 text-white"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in oklab, var(--ocean-deep) 86%, #020617 14%) 0%, var(--ocean-mid) 55%, #0b7285 100%)",
        }}
      >
        <div className="max-w-sm text-center">
          <span className="text-5xl block mb-6">♫</span>
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Vuelve a NodeBeat
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            Inicia sesión y continúa descargando y organizando tu biblioteca.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 text-left text-white/90">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              Descargas rápidas en audio y video
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              Historial de archivos en un solo lugar
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <span className="text-3xl">♫</span>
        </div>

        <AuthCard title="Iniciar Sesión" subtitle="Accede a tu cuenta de NodeBeat">
          {error ? <FormAlert message={error} /> : null}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
              <FormInput
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                label="Correo electrónico"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />

              <FormInput
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                label="Contraseña"
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
                  />
                  Recordarme
                </label>
                <button
                  type="button"
                  className="font-semibold text-cyan-700 transition hover:text-cyan-600"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <FormButton
                type="submit"
                disabled={loading}
                loading={loading}
                loadingText="Ingresando..."
              >
                Entrar
              </FormButton>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  ¿Aún no tienes cuenta?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-cyan-700 transition hover:text-cyan-600"
                  >
                    Crear cuenta
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </AuthCard>
      </div>
    </div>
  );
}
