import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const LOGO_SOURCES = ["/jmg-logo.jpg", "/jmg-logo.png"];

export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [logoIndex, setLogoIndex] = useState(0);

  const from = location.state?.from || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || "No se pudo iniciar sesión");
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-[-140px] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(11,46,128,0.36),_transparent_72%)]" />
      <div className="pointer-events-none absolute -right-16 bottom-[-150px] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,_rgba(37,107,230,0.34),_transparent_70%)]" />

      {logoIndex < LOGO_SOURCES.length ? (
        <img
          src={LOGO_SOURCES[logoIndex]}
          alt="JMG Cerrajería"
          onError={() => setLogoIndex((i) => i + 1)}
          loading="eager"
          className="pointer-events-none absolute right-[3%] top-8 hidden w-52 opacity-30 drop-shadow-[0_18px_30px_rgba(7,27,74,0.35)] motion-safe:animate-drift md:block lg:w-72"
        />
      ) : null}

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[34px] border border-blue-100/55 bg-white/82 shadow-[0_28px_70px_rgba(7,27,74,0.28)] backdrop-blur-xl md:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden border-b border-white/30 bg-[linear-gradient(150deg,rgba(7,27,74,0.99)_0%,rgba(31,88,214,0.93)_100%)] p-7 text-white md:border-b-0 md:border-r md:p-10" aria-label="Marca">
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              Cerrajería JMG
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">Control total para vender rápido y operar con precisión</h1>
            <p className="mt-4 max-w-md text-sm text-white/85 md:text-base">
              Ingresa para administrar inventario, combos, ventas y caja con una interfaz más firme, visual y productiva.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5" aria-hidden="true">
              <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-semibold">Inventario</span>
              <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-semibold">POS</span>
              <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-semibold">Ventas</span>
              <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-semibold">Reportes</span>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(170deg,rgba(255,255,255,0.96)_0%,rgba(218,234,255,0.88)_100%)] p-7 md:p-10" aria-label="Acceso">
          <h2 className="font-display text-2xl font-semibold text-[color:var(--jmg-navy)] md:text-[2rem]">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-600">Acceso seguro para tu equipo.</p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-600">
              Usuario
              <input
                className="rounded-xl border border-[color:var(--jmg-navy)]/25 bg-white px-3 py-2.5 text-slate-700 outline-none ring-0 focus:border-[color:var(--jmg-navy-2)]/70 focus:ring-4 focus:ring-blue-200/60"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-600">
              Contraseña
              <input
                className="rounded-xl border border-[color:var(--jmg-navy)]/25 bg-white px-3 py-2.5 text-slate-700 outline-none ring-0 focus:border-[color:var(--jmg-navy-2)]/70 focus:ring-4 focus:ring-blue-200/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <button
              className="mt-2 w-full rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-4 py-2.5 font-semibold text-slate-50 shadow-[0_12px_24px_rgba(10,45,121,0.28)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-xs font-medium uppercase tracking-[0.13em] text-[color:var(--jmg-muted)]">SoftSmith · JMG Cerrajería</div>
        </section>
      </div>
    </div>
  );
}
