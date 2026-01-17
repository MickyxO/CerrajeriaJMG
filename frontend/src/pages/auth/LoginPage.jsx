import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./LoginPage.css";

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
    <div className="loginPage">
      <div className="loginCard loginCardGrid">
        <section className="loginSide" aria-label="Marca">
          <div className="loginHeader">
            <div className="loginWelcome">Bienvenido, Cerrajer@</div>
            <div className="loginSub">Accede al sistema para gestionar inventario y ventas.</div>

            {logoIndex < LOGO_SOURCES.length ? (
              <img
                className="loginLogo"
                src={LOGO_SOURCES[logoIndex]}
                alt="JMG Cerrajería"
                onError={() => setLogoIndex((i) => i + 1)}
                loading="eager"
              />
            ) : null}

            <div className="loginChips" aria-hidden="true">
              <span className="loginChip">Inventario</span>
              <span className="loginChip">POS</span>
              <span className="loginChip">Ventas</span>
            </div>
          </div>

          <div className="loginSideBottom" aria-hidden="true">
            <div className="loginSideLine">
              <span className="loginDot" />
              <span>Control y orden del negocio</span>
            </div>
            <div className="loginSideLine">
              <span className="loginDot" />
              <span>Acceso seguro por usuario</span>
            </div>
          </div>
        </section>

        <section className="loginMain" aria-label="Acceso">
          <h1 className="loginTitle">Iniciar sesión</h1>

          {error ? <div className="loginError">{error}</div> : null}

          <form className="loginForm" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <button className="loginBtn" type="submit" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="loginFooter">SoftSmith · JMG Cerrajería</div>
        </section>
      </div>
    </div>
  );
}
