'use client';

const links = [
  { label: 'Funciones', target: 'features' },
  { label: 'Proceso', target: 'roadmap' },
  { label: 'Empezar', target: 'cta' },
];

export default function LandingNavLinks() {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav className="hidden items-center gap-8 text-sm font-semibold text-[#a4b0d1] md:flex">
      {links.map(({ label, target }) => (
        <button
          key={target}
          onClick={() => handleScroll(target)}
          className="group relative py-1 transition-colors hover:text-[#8ab2ff] active:scale-95"
        >
          {label}
          <span className="absolute bottom-0 left-0 h-px w-0 rounded-full bg-[#8ab2ff] transition-all duration-300 ease-in-out group-hover:w-full" />
        </button>
      ))}
    </nav>
  );
}
