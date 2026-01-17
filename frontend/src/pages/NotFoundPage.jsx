import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div>
      <h1>404</h1>
      <p>Página no encontrada.</p>
      <Link to="/dashboard">Ir al Dashboard</Link>
    </div>
  );
}
