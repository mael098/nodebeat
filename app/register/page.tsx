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
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    // Validaciones
    if (formData.name.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al registrarse");
      }

      await res.json();

      // Con cookie httpOnly activa, redirigimos directo a la ruta protegida.
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Panel decorativo izquierdo */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16 py-12 text-white"
        style={{
          background:
            "linear-gradient(145deg, var(--ocean-deep) 0%, var(--ocean-mid) 100%)",
        }}
      >
        <div className="max-w-sm text-center">
          <span className="text-6xl block mb-6"></span>
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Únete a NodeBeat
          </h2>
          <p className="text-white/75 text-base leading-relaxed mb-10">
            Crea tu cuenta y comienza a descargar tus videos y audios favoritos
          </p>
        </div>
      </div>

      {/* Panel derecho con formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <span className="text-3xl">🐾</span>
        </div>

        <AuthCard
          title="Crear Cuenta"
          subtitle="Ingresa tus datos para registrarte"
        >
          {error ? <FormAlert message={error} /> : null}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
              <FormInput
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                label="Nombre Completo"
                placeholder="Tu nombre completo"
                required
                autoComplete="name"
              />

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
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />

              <FormInput
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                label="Confirmar contraseña"
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
              />

              <FormButton type="submit" disabled={loading} loading={loading} loadingText="Registrando...">
                Registrarse
              </FormButton>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-cyan-700 transition hover:text-cyan-600"
                  >
                    Inicia sesión
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
