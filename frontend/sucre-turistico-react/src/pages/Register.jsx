
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarUsuario } from "../services/authService";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    password: "",
    rol: "turista"
  });

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function actualizar(e) {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value
    });
  }

  async function manejarRegistro(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      await registrarUsuario(formulario);

      navigate("/login", {
        state: {
          mensaje: "¡Cuenta creada! Ahora puedes iniciar sesión."
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          Sucre Turístico
        </Link>

        <h1>Únete a nuestra comunidad</h1>
        <p>Crea tu cuenta y comienza a descubrir el Golfo.</p>

        <form onSubmit={manejarRegistro}>
          <label>Nombre completo</label>
          <input
            name="nombre"
            value={formulario.nombre}
            onChange={actualizar}
            placeholder="Tu nombre"
            required
          />

          <label>Correo electrónico</label>
          <input
            name="correo"
            type="email"
            value={formulario.correo}
            onChange={actualizar}
            placeholder="correo@ejemplo.com"
            required
          />

          <label>Teléfono</label>
          <input
            name="telefono"
            value={formulario.telefono}
            onChange={actualizar}
            placeholder="Tu número de contacto"
          />

          <label>¿Qué tipo de cuenta deseas crear?</label>
          <select
            name="rol"
            value={formulario.rol}
            onChange={actualizar}
            required
          >
            <option value="turista">Turista - Quiero explorar y reservar</option>
            <option value="propietario">
              Propietario - Quiero registrar mi negocio
            </option>
          </select>

          <label>Contraseña</label>
          <input
            name="password"
            type="password"
            value={formulario.password}
            onChange={actualizar}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={cargando}>
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-bottom">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>

        <Link to="/" className="auth-back">
          ← Volver al inicio
        </Link>
      </section>
    </main>
  );
}
