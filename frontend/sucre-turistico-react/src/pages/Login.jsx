
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const resultado = await login(correo, password);
      const rol = resultado.usuario?.rol;

      if (rol === "administrador") navigate("/admin");
      else if (rol === "propietario") navigate("/propietario");
      else navigate("/turista");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">Sucre Turístico</Link>

        <h1>¡Qué bueno tenerte de vuelta!</h1>
        <p>Ingresa a tu cuenta y descubre el Golfo de Morrosquillo.</p>

        <form onSubmit={manejarLogin}>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={cargando}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="auth-bottom">
          ¿Todavía no tienes cuenta? <Link to="/registro">Regístrate</Link>
        </div>

        <Link to="/" className="auth-back">← Volver al inicio</Link>
      </section>
    </main>
  );
}
