import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[30px] border border-blue-100/55 bg-[linear-gradient(150deg,rgba(255,255,255,0.9)_0%,rgba(210,228,255,0.86)_100%)] p-8 text-center shadow-[0_24px_60px_rgba(7,27,74,0.24)] backdrop-blur-xl">
        <div className="mx-auto mb-4 w-fit rounded-full border border-[color:var(--jmg-navy)]/25 bg-[color:var(--jmg-navy)]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--jmg-navy-2)]">
          Error 404
        </div>
        <h1 className="font-display text-4xl font-semibold text-[color:var(--jmg-navy)] md:text-5xl">Página no encontrada</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 md:text-base">
          La ruta que intentaste abrir no existe o fue movida. Puedes volver al panel principal.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-[0_12px_24px_rgba(10,45,121,0.28)] hover:brightness-110"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
