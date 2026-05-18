import Link from 'next/link';
import Image from 'next/image';
import { Playfair_Display, Manrope } from 'next/font/google';
import LandingAnimations from '@/app/components/ui/landing-animations';
import LandingNavLinks from '@/app/components/ui/landing-nav-links';

const headingFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
});

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const features = [
  {
    title: 'Catalogo visual inteligente',
    description:
      'Cada recurso se ordena por coleccion, etiqueta y objetivo para que tu cliente encuentre valor al instante.',
  },
  {
    title: 'Entrega segura y elegante',
    description:
      'Controla accesos, tiempos y permisos sin friccion con una experiencia limpia de principio a fin.',
  },
  {
    title: 'Control total del negocio',
    description:
      'Usuarios, pagos y contenido en un tablero pensado para decidir rapido y crecer sin caos.',
  },
];

const roadmap = [
  {
    step: 'Paso 1',
    title: 'Sube tu biblioteca',
    description: 'Carga material en minutos y organiza por categorias claras.',
  },
  {
    step: 'Paso 2',
    title: 'Activa acceso privado',
    description: 'Define quien entra, durante cuanto tiempo y con que plan.',
  },
  {
    step: 'Paso 3',
    title: 'Lanza y mejora',
    description: 'Monitorea uso real y ajusta tu producto con datos utiles.',
  },
];

export default function Page() {
  return (
    <main
      className={`${bodyFont.className} relative min-h-screen overflow-hidden bg-[#090f1f] text-[#e7edff]`}
    >
      <LandingAnimations />

      <div className="pointer-events-none absolute inset-0">
        <div
          data-gsap="blob-a"
          className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#3f66ff]/30 blur-3xl"
        />
        <div
          data-gsap="blob-b"
          className="absolute right-4 top-0 h-80 w-80 rounded-full bg-[#ff6b45]/25 blur-3xl"
        />
        <div
          data-gsap="blob-c"
          className="absolute -bottom-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#4dc4ff]/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(105,128,255,0.18),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 pb-20 pt-6 sm:px-8 lg:px-12">
        <header
          data-gsap="nav"
          className="flex items-center justify-between rounded-full border border-[#253459]/80 bg-[#101a31]/75 px-5 py-3 shadow-[0_16px_30px_rgba(0,0,0,0.35)] backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a3b8a] text-sm font-bold text-white">
              NB
            </span>
            <span className={`${headingFont.className} text-xl font-semibold tracking-tight`}>
              NodeBeat
            </span>
          </div>

          <LandingNavLinks />

          <Link
            href="/login"
            className="rounded-full border border-[#35509a] bg-[#203f8d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#294ca3]"
          >
            Ingresar
          </Link>
        </header>

        <section className="grid items-center gap-10 pt-14 md:grid-cols-[1.02fr_0.98fr] md:pt-20">
          <div data-gsap="hero-copy" className="relative">
            <p className="inline-flex rounded-full border border-[#36529f]/55 bg-[#121d38] px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#9ab8ff]">
              Plataforma para productos digitales
            </p>

            <h1
              className={`${headingFont.className} mt-6 text-5xl font-black leading-[0.98] tracking-tight text-[#f4f7ff] sm:text-6xl lg:text-7xl`}
            >
              Convierte tus archivos
              <br />
              en una experiencia premium.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#a5b0ca] sm:text-lg">
              Lanza tu biblioteca con un look profesional, acceso seguro y una
              interfaz pensada para que tus clientes quieran volver.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-[#d1623f] px-7 py-3 text-sm font-bold text-white shadow-[0_14px_26px_rgba(209,98,63,0.35)] transition hover:-translate-y-px hover:bg-[#b85637]"
              >
                Comenzar gratis
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-[#3c5496] bg-[#111a2f] px-7 py-3 text-sm font-bold text-[#c7d7ff] transition hover:border-[#5e78c4]"
              >
                Ver demo interna
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-[#a7b2cf]">
              <span className="rounded-full border border-[#334a86] bg-[#111a31] px-3 py-1 font-semibold">
                Sin codigo
              </span>
              <span className="rounded-full border border-[#334a86] bg-[#111a31] px-3 py-1 font-semibold">
                Setup rapido
              </span>
              <span className="rounded-full border border-[#334a86] bg-[#111a31] px-3 py-1 font-semibold">
                Acceso privado
              </span>
            </div>
          </div>

          <div
            data-gsap="hero-card"
            className="relative rounded-[2.2rem] border border-[#2a3a63] bg-[#0f182d]/90 p-4 shadow-[0_30px_70px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-6"
          >
            <div className="absolute -left-4 -top-4 rounded-2xl bg-[#1a3b8a] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xl">
              Nuevo Look
            </div>
            <div className="mb-4 overflow-hidden rounded-[1.6rem] border border-[#2b3a61] bg-[#0b1429]">
              <Image
                src="/arabella.jpg"
                alt="Imagen principal de la landing de NodeBeat"
                width={1400}
                height={933}
                className="h-auto w-full object-cover"
                priority
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-[#3a4f8f] bg-[#142140] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9ab2f6]">Estado</p>
                <p className="mt-2 text-base font-extrabold text-[#d8e4ff]">MVP activo</p>
              </article>
              <article className="rounded-2xl border border-[#86413f] bg-[#341f29] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#f0b7ac]">Objetivo</p>
                <p className="mt-2 text-base font-extrabold text-[#ffd8d0]">Primeros usuarios</p>
              </article>
              <article className="rounded-2xl border border-[#305272] bg-[#10283c] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#99d2ff]">Modo</p>
                <p className="mt-2 text-base font-extrabold text-[#d4eeff]">Acceso beta</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-4xl border border-[#314679] bg-[linear-gradient(120deg,#121f3f_0%,#1f2344_100%)] p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bdd3ff]">
                Acceso anticipado
              </p>
              <h2 className={`${headingFont.className} mt-3 text-3xl font-bold leading-tight sm:text-4xl`}>
                Abre tu lista de espera con una primera impresion impecable.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#d8e3ff] sm:text-base">
                Esta fase esta pensada para validar rapido con usuarios reales y mejorar el producto con feedback de verdad.
              </p>
            </div>

            <div className="rounded-3xl border border-[#425387] bg-[#0f1934]/70 p-4 backdrop-blur-sm sm:p-5">
              <label htmlFor="waitlist-email" className="text-xs font-bold uppercase tracking-[0.15em] text-[#dbe6ff]">
                Email para notificaciones
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="waitlist-email"
                  type="email"
                  placeholder="tu@email.com"
                  className="h-11 w-full rounded-full border border-[#465787] bg-[#0d1731] px-4 text-sm font-medium text-[#e7edff] outline-none ring-0 placeholder:text-[#91a0c6]"
                />
                <button
                  type="button"
                  className="h-11 rounded-full bg-[#d1623f] px-5 text-sm font-bold text-white transition hover:bg-[#b85637]"
                >
                  Unirme
                </button>
              </div>
              <p className="mt-3 text-xs text-[#d5e2ff]">Sin spam. Solo avances y apertura de cupos beta.</p>
            </div>
          </div>
        </section>

        <section id="features" className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              data-gsap="feature"
              className="rounded-3xl border border-[#2a3b64] bg-[#0f182d]/85 p-6 shadow-[0_16px_35px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8cb5ff]">
                0{index + 1}
              </p>
              <h3 className={`${headingFont.className} mt-3 text-2xl font-bold leading-tight text-[#f2f5ff]`}>
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9ea9c5]">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="overflow-hidden rounded-[1.8rem] border border-[#2a3b64] bg-[#0f182d]/85 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <Image
              src="/landing-feature-content.svg"
              alt="Vista de la biblioteca de contenidos en NodeBeat"
              width={900}
              height={620}
              className="h-auto w-full rounded-3xl"
            />
            <p className="px-2 pb-1 pt-3 text-sm font-semibold text-[#aab5cf]">
              Organiza tu contenido en colecciones visuales y faciles de explorar.
            </p>
          </article>

          <article className="overflow-hidden rounded-[1.8rem] border border-[#2a3b64] bg-[#0f182d]/85 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <Image
              src="/landing-feature-access.svg"
              alt="Vista de control de acceso y seguridad de descargas"
              width={900}
              height={620}
              className="h-auto w-full rounded-3xl"
            />
            <p className="px-2 pb-1 pt-3 text-sm font-semibold text-[#aab5cf]">
              Controla accesos y permisos con una experiencia clara y elegante.
            </p>
          </article>
        </section>

        <section
          id="roadmap"
          data-gsap="how"
          className="mt-16 rounded-4xl border border-[#2b3c66] bg-[linear-gradient(120deg,#0f182f_0%,#13203b_100%)] p-6 sm:p-10"
        >
          <h2 className={`${headingFont.className} text-3xl font-bold text-[#f3f7ff] sm:text-4xl`}>
            Un flujo claro para lanzar sin perder tiempo.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {roadmap.map((item) => (
              <article key={item.step} className="rounded-2xl border border-[#314779] bg-[#121d37] p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8cb6ff]">{item.step}</p>
                <h3 className="mt-2 text-lg font-extrabold text-[#f3f6ff]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9da9c7]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="cta"
          data-gsap="cta"
          className="mt-14 flex flex-col items-start gap-4 rounded-4xl bg-[#1a3b8a] px-6 py-8 text-white shadow-[0_20px_45px_rgba(21,47,110,0.35)] sm:mt-20 sm:flex-row sm:items-center sm:justify-between sm:px-10"
        >
          <div>
            <h3 className={`${headingFont.className} text-3xl font-bold leading-tight`}>
              Haz que tu producto digital luzca tan bien como su contenido.
            </h3>
            <p className="mt-2 text-sm text-white/85 sm:text-base">
              Abre tu cuenta, activa tu biblioteca y empieza a invitar a tus primeros usuarios.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#1a3b8a] transition hover:bg-[#edf3ff]"
          >
            Crear mi espacio
          </Link>
        </section>
      </div>
    </main>
  );
}
