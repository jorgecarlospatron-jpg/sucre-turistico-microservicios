
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerToken } from "../services/authService";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function obtenerFechaLocal() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function DashboardTurista() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const [habitaciones, setHabitaciones] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
  const [fechaEntrada, setFechaEntrada] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [huespedes, setHuespedes] = useState(1);
  const [observaciones, setObservaciones] = useState("");

  const [disponibilidad, setDisponibilidad] = useState(null);
  const [consultandoDisponibilidad, setConsultandoDisponibilidad] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [errorReservas, setErrorReservas] = useState("");

  function salir() {
    logout();
    navigate("/");
  }

  async function cargarHabitaciones() {
    try {
      const respuesta = await fetch(`${API}/api/alojamientos`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron consultar los alojamientos");
      }

      const alojamientos = await respuesta.json();

      const resultados = await Promise.all(
        alojamientos.map(async alojamiento => {
          const respuestaHabitaciones = await fetch(
            `${API}/api/alojamientos/${alojamiento.id}/habitaciones`
          );

          if (!respuestaHabitaciones.ok) return [];

          const datos = await respuestaHabitaciones.json();

          return datos.map(habitacion => ({
            ...habitacion,
            alojamiento_nombre: alojamiento.nombre,
            municipio: alojamiento.municipio,
            imagen: alojamiento.imagen,
            alojamiento_id: alojamiento.id
          }));
        })
      );

      setHabitaciones(
        resultados.flat().filter(
          habitacion =>
            habitacion.estado === "disponible" &&
            Number(habitacion.cantidad) > 0
        )
      );

    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarReservas() {
    try {
      const token = obtenerToken();

      const respuesta = await fetch(
        `${API}/api/reservas/mis-reservas`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar las reservas");
      }

      setReservas(datos);
      setErrorReservas("");

    } catch (err) {
      setErrorReservas(err.message);
    }
  }

  async function cargarDatos() {
    setCargando(true);

    await Promise.all([
      cargarHabitaciones(),
      cargarReservas()
    ]);

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  // Consultar disponibilidad automáticamente al seleccionar fechas.
  useEffect(() => {
    if (!habitacionSeleccionada || !fechaEntrada || !fechaSalida) {
      setDisponibilidad(null);
      setConsultandoDisponibilidad(false);
      setErrorDisponibilidad("");
      return;
    }

    if (
      fechaEntrada < obtenerFechaLocal() ||
      fechaSalida <= fechaEntrada
    ) {
      setDisponibilidad(null);
      setConsultandoDisponibilidad(false);
      setErrorDisponibilidad("");
      return;
    }

    const controlador = new AbortController();

    async function consultarDisponibilidad() {
      setConsultandoDisponibilidad(true);
      setDisponibilidad(null);
      setErrorDisponibilidad("");

      try {
        const parametros = new URLSearchParams({
          fecha_entrada: fechaEntrada,
          fecha_salida: fechaSalida
        });

        const respuesta = await fetch(
          `${API}/api/reservas/disponibilidad/${habitacionSeleccionada.id}?${parametros}`,
          {
            signal: controlador.signal
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo consultar la disponibilidad"
          );
        }

        setDisponibilidad(datos);

      } catch (err) {
        if (err.name !== "AbortError") {
          setErrorDisponibilidad(err.message);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setConsultandoDisponibilidad(false);
        }
      }
    }

    consultarDisponibilidad();

    return () => controlador.abort();
  }, [habitacionSeleccionada, fechaEntrada, fechaSalida]);

  function abrirReserva(habitacion) {
    setHabitacionSeleccionada(habitacion);
    setFechaEntrada("");
    setFechaSalida("");
    setHuespedes(1);
    setObservaciones("");
    setDisponibilidad(null);
    setErrorDisponibilidad("");
    setMensaje("");
    setError("");

    document.getElementById("catalogo")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  function calcularNoches() {
    if (!fechaEntrada || !fechaSalida) return 0;

    const entrada = new Date(`${fechaEntrada}T00:00:00`);
    const salida = new Date(`${fechaSalida}T00:00:00`);

    return Math.max(
      0,
      Math.round((salida - entrada) / 86400000)
    );
  }

  const noches = calcularNoches();

  const precioTotal = habitacionSeleccionada
    ? noches * Number(habitacionSeleccionada.precio_noche)
    : 0;

  const fechasValidas =
    fechaEntrada &&
    fechaSalida &&
    fechaEntrada >= obtenerFechaLocal() &&
    fechaSalida > fechaEntrada;

  const sinDisponibilidad =
    disponibilidad && Number(disponibilidad.habitaciones_disponibles) <= 0;

  const puedeReservar =
    fechasValidas &&
    disponibilidad &&
    disponibilidad.disponible === true &&
    !consultandoDisponibilidad &&
    !guardando;

  async function solicitarReserva(e) {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!obtenerToken()) {
      setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    if (!fechaEntrada || !fechaSalida || noches <= 0) {
      setError("Selecciona fechas válidas para tu estadía.");
      return;
    }

    if (fechaEntrada < obtenerFechaLocal()) {
      setError("La fecha de entrada no puede estar en el pasado.");
      return;
    }

    if (Number(huespedes) > Number(habitacionSeleccionada.capacidad)) {
      setError(
        `Esta habitación permite máximo ${habitacionSeleccionada.capacidad} huéspedes.`
      );
      return;
    }

    if (consultandoDisponibilidad || !disponibilidad) {
      setError("Espera a que se consulte la disponibilidad.");
      return;
    }

    if (!disponibilidad.disponible) {
      setError("No hay habitaciones disponibles para esas fechas.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(`${API}/api/reservas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${obtenerToken()}`
        },
        body: JSON.stringify({
          habitacion_id: habitacionSeleccionada.id,
          fecha_entrada: fechaEntrada,
          fecha_salida: fechaSalida,
          cantidad_huespedes: Number(huespedes),
          observaciones
        })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo crear la reserva");
      }

      setMensaje(
        `¡Solicitud enviada! Total: $${Number(
          resultado.reserva.precio_total
        ).toLocaleString("es-CO")} COP. Está pendiente de confirmación.`
      );

      setHabitacionSeleccionada(null);
      setDisponibilidad(null);

      await cargarDatos();

    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cancelarReserva(id) {
    const confirmar = window.confirm(
      "¿Estás seguro de cancelar esta reserva?"
    );

    if (!confirmar) return;

    try {
      setErrorReservas("");

      const respuesta = await fetch(
        `${API}/api/reservas/${id}/cancelar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${obtenerToken()}`
          }
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo cancelar la reserva");
      }

      await cargarReservas();

    } catch (err) {
      setErrorReservas(err.message);
    }
  }

  const pendientes = reservas.filter(r => r.estado === "pendiente").length;
  const aceptadas = reservas.filter(r => r.estado === "aceptada").length;

  return (
    <div className="dashboard turista-dashboard">
      <aside className="dashboard-sidebar">
        <h2>Sucre Turístico</h2>
        <p>PORTAL DEL VIAJERO</p>

        <nav>
          <Link to="/turista">⌂ Inicio</Link>
          <a href="#catalogo">⌕ Alojamientos</a>
          <a href="#reservas">▣ Mis reservas</a>
          <a href="#perfil">♙ Mi perfil</a>
        </nav>

        <button onClick={salir}>Cerrar sesión</button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span>PORTAL DEL TURISTA</span>
            <h1>¡Hola, {usuario?.nombre || "Viajero"}!</h1>
            <p>Prepárate para descubrir el Golfo de Morrosquillo.</p>
          </div>

          <div className="dashboard-avatar">
            {(usuario?.nombre || "T").charAt(0).toUpperCase()}
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span>DESCUBRE SUCRE</span>
            <h2>Tu próxima aventura comienza aquí.</h2>
            <p>
              Encuentra alojamientos y reserva tu próxima experiencia.
            </p>
            <a href="#catalogo">Buscar habitaciones →</a>
          </div>
        </section>

        {mensaje && (
          <p className="auth-success">{mensaje}</p>
        )}

        {error && (
          <p className="auth-error">{error}</p>
        )}

        <section className="dashboard-stats">
          <article>
            <span>▣</span>
            <h3>Mis reservas</h3>
            <strong>{reservas.length}</strong>
            <p>Solicitudes realizadas</p>
          </article>

          <article>
            <span>⌛</span>
            <h3>Pendientes</h3>
            <strong>{pendientes}</strong>
            <p>Esperando confirmación</p>
          </article>

          <article>
            <span>✓</span>
            <h3>Confirmadas</h3>
            <strong>{aceptadas}</strong>
            <p>Reservas aceptadas</p>
          </article>
        </section>

        <section className="dashboard-section" id="catalogo">
          <h2>Explorar habitaciones</h2>
          <p>Selecciona una habitación para consultar y solicitar tu reserva.</p>

          {cargando && <p>Cargando habitaciones...</p>}

          {!cargando && habitaciones.length === 0 && (
            <div className="dashboard-empty">
              <span>🏨</span>
              <h3>No hay habitaciones disponibles</h3>
              <p>Vuelve a consultar más tarde.</p>
            </div>
          )}

          <div className="grid">
            {habitaciones.map(habitacion => (
              <article className="card" key={habitacion.id}>
                <img
                  src={
                    habitacion.imagen ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945"
                  }
                  alt={habitacion.alojamiento_nombre}
                />

                <div>
                  <span className="tag">{habitacion.alojamiento_nombre}</span>
                  <h3>{habitacion.nombre}</h3>
                  <p>📍 {habitacion.municipio}</p>
                  <p>{habitacion.descripcion}</p>
                  <p>Capacidad: {habitacion.capacidad} huéspedes</p>
                  <p>Habitaciones disponibles: {habitacion.cantidad}</p>

                  <strong>
                    ${Number(habitacion.precio_noche).toLocaleString("es-CO")} COP por noche
                  </strong>

                  <button
                    className="admin"
                    onClick={() => abrirReserva(habitacion)}
                  >
                    Reservar ahora
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {habitacionSeleccionada && (
          <section className="dashboard-section" id="formulario-reserva">
            <h2>Solicitar reserva</h2>

            <div className="profile-card">
              <h3>{habitacionSeleccionada.nombre}</h3>
              <p>{habitacionSeleccionada.alojamiento_nombre}</p>
              <p>{habitacionSeleccionada.municipio}</p>
              <p>
                Precio por noche: $
                {Number(habitacionSeleccionada.precio_noche).toLocaleString("es-CO")} COP
              </p>
            </div>

            <form
              className="form-habitacion"
              onSubmit={solicitarReserva}
            >
              <label>Fecha de entrada</label>
              <input
                type="date"
                min={obtenerFechaLocal()}
                value={fechaEntrada}
                onChange={e => setFechaEntrada(e.target.value)}
                required
              />

              <label>Fecha de salida</label>
              <input
                type="date"
                min={fechaEntrada || obtenerFechaLocal()}
                value={fechaSalida}
                onChange={e => setFechaSalida(e.target.value)}
                required
              />

              <label>Cantidad de huéspedes</label>
              <input
                type="number"
                min="1"
                max={habitacionSeleccionada.capacidad}
                value={huespedes}
                onChange={e => setHuespedes(e.target.value)}
                required
              />

              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Comentarios adicionales (opcional)"
              />

              {/* Información de disponibilidad */}
              <div className="profile-card">
                <h3>Disponibilidad de la habitación</h3>

                {!fechasValidas && (
                  <p>Selecciona las fechas de entrada y salida para consultar la disponibilidad.</p>
                )}

                {consultandoDisponibilidad && (
                  <p>Consultando disponibilidad...</p>
                )}

                {errorDisponibilidad && (
                  <p className="auth-error">{errorDisponibilidad}</p>
                )}

                {disponibilidad && !consultandoDisponibilidad && (
                  <>
                    <p>
                      <strong>Habitaciones totales:</strong>{" "}
                      {disponibilidad.cantidad_total}
                    </p>

                    <p>
                      <strong>Habitaciones ocupadas:</strong>{" "}
                      {disponibilidad.habitaciones_ocupadas}
                    </p>

                    <p>
                      <strong>Habitaciones disponibles:</strong>{" "}
                      {disponibilidad.habitaciones_disponibles}
                    </p>

                    {sinDisponibilidad ? (
                      <p className="auth-error">
                        No hay habitaciones disponibles para estas fechas.
                      </p>
                    ) : (
                      <p className="auth-success">
                        ¡Hay habitaciones disponibles para tu estadía!
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="profile-card">
                <p><strong>Noches:</strong> {noches}</p>
                <h3>
                  Total: ${precioTotal.toLocaleString("es-CO")} COP
                </h3>
              </div>

              <button
                type="submit"
                disabled={!puedeReservar}
              >
                {guardando
                  ? "Enviando..."
                  : consultandoDisponibilidad
                    ? "Consultando disponibilidad..."
                    : sinDisponibilidad
                      ? "Sin habitaciones disponibles"
                      : "Confirmar solicitud"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setHabitacionSeleccionada(null);
                  setDisponibilidad(null);
                  setErrorDisponibilidad("");
                }}
              >
                Cancelar
              </button>
            </form>
          </section>
        )}

        <section className="dashboard-section" id="reservas">
          <h2>Mis reservas</h2>

          {errorReservas && (
            <p className="auth-error">{errorReservas}</p>
          )}

          {reservas.length === 0 && !errorReservas && (
            <div className="dashboard-empty">
              <span>🏖️</span>
              <h3>¡Todavía no tienes reservas!</h3>
              <p>Encuentra un alojamiento y comienza a planear tu viaje.</p>
              <a href="#catalogo">Buscar alojamientos</a>
            </div>
          )}

          <div className="grid">
            {reservas.map(reserva => (
              <article className="card" key={reserva.id}>
                <div>
                  <span className="tag">{reserva.estado.toUpperCase()}</span>
                  <h3>{reserva.alojamiento_nombre}</h3>
                  <p>{reserva.habitacion_nombre}</p>
                  <p>{reserva.municipio}</p>
                  <p>Entrada: {String(reserva.fecha_entrada).slice(0, 10)}</p>
                  <p>Salida: {String(reserva.fecha_salida).slice(0, 10)}</p>
                  <p>Huéspedes: {reserva.cantidad_huespedes}</p>

                  <strong>
                    ${Number(reserva.precio_total).toLocaleString("es-CO")} COP
                  </strong>

                  {(reserva.estado === "pendiente" ||
                    reserva.estado === "aceptada") && (
                    <button
                      type="button"
                      onClick={() => cancelarReserva(reserva.id)}
                    >
                      Cancelar reserva
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-section" id="perfil">
          <h2>Mi información</h2>

          <div className="profile-card">
            <p>
              <strong>Nombre:</strong> {usuario?.nombre || "No disponible"}
            </p>
            <p>
              <strong>Correo:</strong> {usuario?.correo || "No disponible"}
            </p>
            <p><strong>Rol:</strong> Turista</p>
          </div>
        </section>
      </main>
    </div>
  );
}
  