

import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import { obtenerToken } from "../services/authService";

import "./Dashboard.css";



const API = import.meta.env.VITE_API_URL || "http://localhost:3000";



const formularioInicial = {

  nombre: "",

  descripcion: "",

  capacidad: 2,

  cantidad: 1,

  precio_noche: ""

};



export default function DashboardPropietario() {

  const { usuario, logout } = useAuth();

  const navigate = useNavigate();



  const [alojamientos, setAlojamientos] = useState([]);

  const [cargando, setCargando] = useState(true);



  const [error, setError] = useState("");

  const [mostrarFormularioEstablecimiento, setMostrarFormularioEstablecimiento] = useState(false);

  const [guardandoEstablecimiento, setGuardandoEstablecimiento] = useState(false);

  const [mensajeEstablecimiento, setMensajeEstablecimiento] = useState("");

  const [errorEstablecimiento, setErrorEstablecimiento] = useState("");

  const [imagenEstablecimiento, setImagenEstablecimiento] = useState(null);

  const [imagenUrl, setImagenUrl] = useState("");

  const [establecimientoEditando, setEstablecimientoEditando] = useState(null);



const [formEstablecimiento, setFormEstablecimiento] = useState({

  nombre: "",

  municipio: "",

  tipo: "Hotel",

  descripcion: ""

});

  const [alojamientoSeleccionado, setAlojamientoSeleccionado] = useState(null);

  const [habitaciones, setHabitaciones] = useState([]);



  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [editando, setEditando] = useState(false);

  const [habitacionEditando, setHabitacionEditando] = useState(null);



  const [guardandoHabitacion, setGuardandoHabitacion] = useState(false);

  const [mensajeHabitacion, setMensajeHabitacion] = useState("");

  const [errorHabitacion, setErrorHabitacion] = useState("");



  const [formHabitacion, setFormHabitacion] = useState(formularioInicial);



  // NUEVO: ESTADOS DE RESERVAS

  const [reservas, setReservas] = useState([]);

  const [cargandoReservas, setCargandoReservas] = useState(true);

  const [errorReservas, setErrorReservas] = useState("");

  const [mensajeReserva, setMensajeReserva] = useState("");

  const [procesandoReserva, setProcesandoReserva] = useState(null);



  // NOTIFICACIONES DEL PROPIETARIO

  const [notificaciones, setNotificaciones] = useState([]);

  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(true);

  const [errorNotificaciones, setErrorNotificaciones] = useState("");



  async function cargarAlojamientos() {

  try {

    const token = obtenerToken();



    if (!token) {

      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

    }



    const respuesta = await fetch(`${API}/api/alojamientos`, {

      headers: {

        Authorization: `Bearer ${token}`

      }

    });



      if (!respuesta.ok) {

        throw new Error("No se pudieron cargar los alojamientos");

      }



      const datos = await respuesta.json();



      const propios = datos.filter(

        item => Number(item.propietario_id) === Number(usuario?.id)

      );



      setAlojamientos(propios);

    } catch (err) {

      setError(err.message);

    } finally {

      setCargando(false);

    }

  }



function prepararEdicionEstablecimiento(item) {

  setEstablecimientoEditando(item.id);

  setFormEstablecimiento({

    nombre: item.nombre || "",

    municipio: item.municipio || "",

    tipo: item.tipo || "Hotel",

    descripcion: item.descripcion || ""

  });

  setImagenEstablecimiento(null);

  setImagenUrl(/^https?:\/\//i.test(item.imagen || "") ? item.imagen : "");

  setMostrarFormularioEstablecimiento(true);

  setErrorEstablecimiento("");

  setMensajeEstablecimiento("");

  document.getElementById("alojamientos")?.scrollIntoView({

    behavior: "smooth"

  });

}



async function eliminarEstablecimiento(item) {

  const confirmar = window.confirm(

    `¿Seguro que deseas eliminar "${item.nombre}"? Si tiene habitaciones o reservas asociadas, el sistema impedirá eliminarlo.`

  );

  if (!confirmar) return;



  setErrorEstablecimiento("");

  setMensajeEstablecimiento("");



  try {

    const token = obtenerToken();

    if (!token) {

      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

    }



    const respuesta = await fetch(`${API}/api/alojamientos/${item.id}`, {

      method: "DELETE",

      headers: { Authorization: `Bearer ${token}` }

    });



    const resultado = await respuesta.json();

    if (!respuesta.ok) {

      throw new Error(resultado.error || "No se pudo eliminar el establecimiento");

    }



    if (Number(alojamientoSeleccionado?.id) === Number(item.id)) {

      setAlojamientoSeleccionado(null);

      setHabitaciones([]);

    }



    setMensajeEstablecimiento("Establecimiento eliminado correctamente.");

    await cargarAlojamientos();

  } catch (err) {

    setErrorEstablecimiento(err.message);

  }

}



async function guardarEstablecimiento(e) {

  e.preventDefault();



  // El segundo botón del formulario permite reenviar un alojamiento rechazado.

  const reenviarRevision = e.nativeEvent?.submitter?.value === "reenviar";



  setGuardandoEstablecimiento(true);

  setErrorEstablecimiento("");

  setMensajeEstablecimiento("");



  try {

    const token = obtenerToken();



    if (!token) {

      throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

    }



    let imagen = imagenUrl.trim() || null;



      if (imagen && !/^https?:\/\//i.test(imagen)) {

      throw new Error("La dirección de la imagen debe comenzar con http:// o https://.");

    }



    if (imagenEstablecimiento) {

      if (imagenEstablecimiento.size > 2 * 1024 * 1024) {

        throw new Error("La imagen no puede superar los 2 MB.");

      }



      imagen = await new Promise((resolve, reject) => {

        const lector = new FileReader();



        lector.onload = () => resolve(lector.result);

        lector.onerror = () => reject(new Error("No se pudo leer la imagen"));



        lector.readAsDataURL(imagenEstablecimiento);

      });

    }



    const editandoEstablecimiento = Boolean(establecimientoEditando);



    const respuesta = await fetch(

      editandoEstablecimiento

        ? `${API}/api/alojamientos/${establecimientoEditando}`

        : `${API}/api/alojamientos/propietario`,

      {

        method: editandoEstablecimiento ? "PUT" : "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`

        },

        body: JSON.stringify({

          ...formEstablecimiento,

          imagen,

          reenviar_revision: reenviarRevision

        })

      }

    );



    const resultado = await respuesta.json();



    if (!respuesta.ok) {

      throw new Error(resultado.error || "No se pudo registrar el establecimiento");

    }



    setMensajeEstablecimiento(

      reenviarRevision

        ? "¡Establecimiento corregido y reenviado! Está pendiente de una nueva revisión."

        : editandoEstablecimiento

          ? "Establecimiento actualizado correctamente."

          : "¡Establecimiento registrado! Está pendiente de revisión por el administrador."

    );



    setFormEstablecimiento({

      nombre: "",

      municipio: "",

      tipo: "Hotel",

      descripcion: ""

    });



    setImagenEstablecimiento(null);

    setImagenUrl("");

    setMostrarFormularioEstablecimiento(false);

    setEstablecimientoEditando(null);



    await cargarAlojamientos();



  } catch (err) {

    setErrorEstablecimiento(err.message);

  } finally {

    setGuardandoEstablecimiento(false);

  }

}

  // CONSULTAR SOLICITUDES DEL PROPIETARIO

  async function cargarReservas() {

    setCargandoReservas(true);

    setErrorReservas("");



    try {

      const token = obtenerToken();



      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const respuesta = await fetch(

        `${API}/api/reservas/propietario`,

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

    } catch (err) {

      setErrorReservas(err.message);

    } finally {

      setCargandoReservas(false);

    }

  }



  // CONSULTAR NOTIFICACIONES DEL PROPIETARIO

  async function cargarNotificaciones() {

    setCargandoNotificaciones(true);

    setErrorNotificaciones("");



    try {

      const token = obtenerToken();

      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const respuesta = await fetch(`${API}/api/usuarios/notificaciones`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      const datos = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(datos.error || "No se pudieron cargar las notificaciones");

      }



      setNotificaciones(Array.isArray(datos) ? datos : datos.notificaciones || []);

    } catch (err) {

      setErrorNotificaciones(err.message);

    } finally {

      setCargandoNotificaciones(false);

    }

  }



  // MARCAR UNA NOTIFICACIÓN COMO LEÍDA

  async function marcarNotificacionLeida(id) {

    try {

      const token = obtenerToken();

      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const respuesta = await fetch(

        `${API}/api/usuarios/notificaciones/${id}/leida`,

        {

          method: "PATCH",

          headers: { Authorization: `Bearer ${token}` }

        }

      );

      const resultado = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(resultado.error || "No se pudo marcar como leída");

      }



      setNotificaciones(actuales =>

        actuales.map(item => Number(item.id) === Number(id)

          ? { ...item, leida: 1 }

          : item

        )

      );

    } catch (err) {

      setErrorNotificaciones(err.message);

    }

  }



  useEffect(() => {

    cargarAlojamientos();

    cargarReservas();

    cargarNotificaciones();

  }, []);



  function salir() {

    logout();

    navigate("/");

  }



  async function abrirHabitaciones(alojamiento) {

    setAlojamientoSeleccionado(alojamiento);

    setHabitaciones([]);

    setErrorHabitacion("");

    setMensajeHabitacion("");

    setMostrarFormulario(false);

    setEditando(false);



    try {

      const respuesta = await fetch(

        `${API}/api/alojamientos/${alojamiento.id}/habitaciones`

      );



      if (!respuesta.ok) {

        throw new Error("No se pudieron consultar las habitaciones");

      }



      const datos = await respuesta.json();

      setHabitaciones(datos);



      document.getElementById("habitaciones")?.scrollIntoView({

        behavior: "smooth"

      });

    } catch (error) {

      setErrorHabitacion(error.message);

    }

  }



  function actualizarHabitacion(e) {

    setFormHabitacion({

      ...formHabitacion,

      [e.target.name]: e.target.value

    });

  }



  function prepararEdicion(habitacion) {

    setHabitacionEditando(habitacion.id);



    setFormHabitacion({

      nombre: habitacion.nombre || "",

      descripcion: habitacion.descripcion || "",

      capacidad: habitacion.capacidad,

      cantidad: habitacion.cantidad,

      precio_noche: habitacion.precio_noche,

      estado: habitacion.estado

    });



    setEditando(true);

    setMostrarFormulario(true);

    setErrorHabitacion("");

    setMensajeHabitacion("");



    document.getElementById("habitaciones")?.scrollIntoView({

      behavior: "smooth"

    });

  }



  function cancelarFormulario() {

    setMostrarFormulario(false);

    setEditando(false);

    setHabitacionEditando(null);

    setFormHabitacion(formularioInicial);

    setErrorHabitacion("");

  }



  async function guardarHabitacion(e) {

    e.preventDefault();



    setGuardandoHabitacion(true);

    setErrorHabitacion("");

    setMensajeHabitacion("");



    try {

      const token = obtenerToken();



      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const datos = {

        ...formHabitacion,

        capacidad: Number(formHabitacion.capacidad),

        cantidad: Number(formHabitacion.cantidad),

        precio_noche: Number(formHabitacion.precio_noche)

      };



      const url = editando

        ? `${API}/api/habitaciones/${habitacionEditando}`

        : `${API}/api/alojamientos/${alojamientoSeleccionado.id}/habitaciones`;



      const respuesta = await fetch(url, {

        method: editando ? "PUT" : "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`

        },

        body: JSON.stringify(datos)

      });



      const resultado = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(

          resultado.error || "No se pudo guardar la habitación"

        );

      }



      const mensaje = editando

        ? "¡Habitación actualizada correctamente!"

        : "¡Habitación registrada correctamente!";



      setMostrarFormulario(false);

      setEditando(false);

      setHabitacionEditando(null);

      setFormHabitacion(formularioInicial);



      await abrirHabitaciones(alojamientoSeleccionado);

      setMensajeHabitacion(mensaje);



    } catch (error) {

      setErrorHabitacion(error.message);

    } finally {

      setGuardandoHabitacion(false);

    }

  }



  async function eliminarHabitacion(habitacion) {

    const confirmar = window.confirm(

      `¿Estás seguro de eliminar la habitación "${habitacion.nombre}"?`

    );



    if (!confirmar) return;



    setErrorHabitacion("");

    setMensajeHabitacion("");



    try {

      const token = obtenerToken();



      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const respuesta = await fetch(

        `${API}/api/habitaciones/${habitacion.id}`,

        {

          method: "DELETE",

          headers: {

            Authorization: `Bearer ${token}`

          }

        }

      );



      const resultado = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(

          resultado.error || "No se pudo eliminar la habitación"

        );

      }



      await abrirHabitaciones(alojamientoSeleccionado);

      setMensajeHabitacion("¡Habitación eliminada correctamente!");



    } catch (error) {

      setErrorHabitacion(error.message);

    }

  }



  // ACEPTAR O RECHAZAR UNA RESERVA

  async function cambiarEstadoReserva(reserva, nuevoEstado) {

    const accion = nuevoEstado === "aceptada" ? "aceptar" : "rechazar";



    const confirmar = window.confirm(

      `¿Estás seguro de ${accion} la reserva de ${reserva.turista_nombre}?`

    );



    if (!confirmar) return;



    setProcesandoReserva(reserva.id);

    setErrorReservas("");

    setMensajeReserva("");



    try {

      const token = obtenerToken();



      if (!token) {

        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");

      }



      const respuesta = await fetch(

        `${API}/api/reservas/${reserva.id}/estado`,

        {

          method: "PATCH",

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`

          },

          body: JSON.stringify({

            estado: nuevoEstado

          })

        }

      );



      const resultado = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(

          resultado.error || "No se pudo actualizar la reserva"

        );

      }



      setMensajeReserva(resultado.mensaje);

      await cargarReservas();



    } catch (err) {

      setErrorReservas(err.message);

    } finally {

      setProcesandoReserva(null);

    }

  }



  const pendientes = reservas.filter(

    reserva => reserva.estado === "pendiente"

  ).length;



  const aceptadas = reservas.filter(

    reserva => reserva.estado === "aceptada"

  ).length;



  function formatearFecha(fecha) {

    if (!fecha) return "No disponible";



    const valor = String(fecha).slice(0, 10);

    const [anio, mes, dia] = valor.split("-");



    return `${dia}/${mes}/${anio}`;

  }



  function formatearPrecio(precio) {

    return Number(precio).toLocaleString("es-CO");

  }



  const alojamientoEnEdicion = alojamientos.find(

    item => Number(item.id) === Number(establecimientoEditando)

  );

  const alojamientoRechazado =

    String(alojamientoEnEdicion?.estado || "").trim().toLowerCase() === "rechazado";



  return (

    <div className="dashboard propietario-dashboard">

      <aside className="dashboard-sidebar">

        <h2>Sucre Turístico</h2>

        <p>PORTAL DEL PROPIETARIO</p>



        <nav>

          <a href="#inicio">⌂ Inicio</a>

          <a href="#alojamientos">⌂ Mis alojamientos</a>

          <a href="#habitaciones">▦ Habitaciones</a>

          <a href="#reservas">▣ Reservas</a>

          <a href="#notificaciones">🔔 Notificaciones {notificaciones.filter(n => !Number(n.leida)).length > 0 && `(${notificaciones.filter(n => !Number(n.leida)).length})`}</a>

        </nav>



        <button onClick={salir}>Cerrar sesión</button>

      </aside>



      <main className="dashboard-main">

        <header className="dashboard-header" id="inicio">

          <div>

            <span>PORTAL DEL PROPIETARIO</span>

            <h1>¡Hola, {usuario?.nombre || "Propietario"}!</h1>

            <p>Administra tus establecimientos turísticos.</p>

          </div>



          <button

            type="button"

            className="admin"

            onClick={() => document.getElementById("notificaciones")?.scrollIntoView({ behavior: "smooth" })}

          >

            🔔 Notificaciones ({notificaciones.filter(n => !Number(n.leida)).length})

          </button>



          <div className="dashboard-avatar">

            {(usuario?.nombre || "P").charAt(0).toUpperCase()}

          </div>

        </header>



        <section className="dashboard-welcome">

          <div>

            <span>GESTIÓN DE ALOJAMIENTOS</span>

            <h2>Administra tu negocio turístico.</h2>

            <p>

              Consulta tus establecimientos, habitaciones y reservas.

            </p>

          </div>

        </section>

{/* REGISTRAR ESTABLECIMIENTO */}

<section className="dashboard-section">

  <div style={{

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    flexWrap: "wrap",

    gap: "12px"

  }}>

    <div>

      <h2>Mi negocio turístico</h2>

      <p>Registra tu hotel, restaurante, cabaña o establecimiento.</p>

    </div>



    <button

      className="admin"

      onClick={() => {

        setMostrarFormularioEstablecimiento(!mostrarFormularioEstablecimiento);

        setEstablecimientoEditando(null);

        setFormEstablecimiento({

          nombre: "",

          municipio: "",

          tipo: "Hotel",

          descripcion: ""

        });

        setImagenEstablecimiento(null);

        setImagenUrl("");

        setErrorEstablecimiento("");

        setMensajeEstablecimiento("");

      }}

    >

      + Registrar establecimiento

    </button>

  </div>



  {mensajeEstablecimiento && (

    <p className="auth-success">{mensajeEstablecimiento}</p>

  )}



  {errorEstablecimiento && (

    <p className="auth-error">{errorEstablecimiento}</p>

  )}



  {mostrarFormularioEstablecimiento && (

    <form

      className="form-habitacion"

      onSubmit={guardarEstablecimiento}

    >

      <h3>{establecimientoEditando ? "Editar establecimiento" : "Registrar mi establecimiento"}</h3>



      <label>Nombre comercial</label>

      <input

        value={formEstablecimiento.nombre}

        onChange={e => setFormEstablecimiento({

          ...formEstablecimiento,

          nombre: e.target.value

        })}

        placeholder="Ejemplo: Los Pollos Hermanos"

        required

      />



      <label>Municipio</label>

      <input

        value={formEstablecimiento.municipio}

        onChange={e => setFormEstablecimiento({

          ...formEstablecimiento,

          municipio: e.target.value

        })}

        placeholder="Ejemplo: Sincelejo"

        required

      />



      <label>Tipo de establecimiento</label>

      <select

        value={formEstablecimiento.tipo}

        onChange={e => setFormEstablecimiento({

          ...formEstablecimiento,

          tipo: e.target.value

        })}

      >

        <option value="Hotel">Hotel</option>

        <option value="Restaurante">Restaurante</option>

        <option value="Cabañas">Cabañas</option>

        <option value="Agencia turística">Agencia turística</option>

        <option value="Otro">Otro</option>

      </select>



      <label>Descripción del negocio</label>

      <textarea

        value={formEstablecimiento.descripcion}

        onChange={e => setFormEstablecimiento({

          ...formEstablecimiento,

          descripcion: e.target.value

        })}

        placeholder="Describe tu establecimiento..."

        rows="4"

      />



      <label>Fotografía del establecimiento</label>

      <p className="imagen-ayuda">

        Puedes subir una imagen desde tu dispositivo o pegar un enlace de Internet.

        Si editas el alojamiento y no cambias la imagen, se conservará la actual.

      </p>



      <label htmlFor="imagen-establecimiento">Subir desde el dispositivo</label>

      <input

        id="imagen-establecimiento"

        type="file"

        accept="image/*"

        onChange={e => {

          setImagenEstablecimiento(e.target.files?.[0] || null);

          if (e.target.files?.[0]) setImagenUrl("");

        }}

      />



      {imagenEstablecimiento && (

        <p className="imagen-ayuda">Imagen seleccionada: {imagenEstablecimiento.name}</p>

      )}



      <label htmlFor="imagen-url">O pegar un enlace de imagen de Internet</label>

      <input

        id="imagen-url"

        type="url"

        value={imagenUrl}

        onChange={e => {

          setImagenUrl(e.target.value);

          if (e.target.value) setImagenEstablecimiento(null);

        }}

        placeholder="https://ejemplo.com/foto-hotel.jpg"

      />



      {(imagenUrl || imagenEstablecimiento) && (

        <div className="imagen-preview">

          <span>Vista previa</span>

          <img

            src={imagenEstablecimiento ? URL.createObjectURL(imagenEstablecimiento) : imagenUrl}

            alt="Vista previa del establecimiento"

            onError={e => { e.currentTarget.style.display = "none"; }}

          />

        </div>

      )}



      <button

        type="submit"

        name="accionEstablecimiento"

        value="guardar"

        className="admin"

        disabled={guardandoEstablecimiento}

      >

        {guardandoEstablecimiento

          ? "Guardando..."

          : establecimientoEditando

            ? "Guardar cambios"

            : "Registrar establecimiento"}

      </button>



      {establecimientoEditando && alojamientoRechazado && (

        <button

          type="submit"

          name="accionEstablecimiento"

          value="reenviar"

          className="admin"

          disabled={guardandoEstablecimiento}

        >

          {guardandoEstablecimiento

            ? "Enviando..."

            : "Guardar y reenviar para revisión"}

        </button>

      )}



      <button

        type="button"

        onClick={() => {

          setMostrarFormularioEstablecimiento(false);

          setEstablecimientoEditando(null);

          setImagenEstablecimiento(null);

          setImagenUrl("");

          setFormEstablecimiento({

            nombre: "",

            municipio: "",

            tipo: "Hotel",

            descripcion: ""

          });

        }}

      >

        Cancelar

      </button>

    </form>

  )}

</section>

        {/* ESTADÍSTICAS */}

        <section className="dashboard-stats">

          <article>

            <span>⌂</span>

            <h3>Mis alojamientos</h3>

            <strong>{alojamientos.length}</strong>

            <p>Establecimientos registrados</p>

          </article>



          <article>

            <span>▦</span>

            <h3>Habitaciones</h3>

            <strong>{habitaciones.length}</strong>

            <p>Habitaciones del alojamiento seleccionado</p>

          </article>



          <article>

            <span>▣</span>

            <h3>Reservas pendientes</h3>

            <strong>{pendientes}</strong>

            <p>{aceptadas} reservas aceptadas</p>

          </article>

        </section>



        {/* ALOJAMIENTOS */}

        <section className="dashboard-section" id="alojamientos">

          <h2>Mis alojamientos</h2>



          {cargando && <p>Cargando establecimientos...</p>}



          {error && <p className="auth-error">{error}</p>}



          {!cargando && !error && alojamientos.length === 0 && (

            <div className="dashboard-empty">

              <span>🏨</span>

              <h3>No tienes alojamientos asignados</h3>

              <p>

                Cuando tengas establecimientos vinculados a tu cuenta

                aparecerán aquí.

              </p>

            </div>

          )}



          <div className="grid">

            {alojamientos.map(item => (

              <article className="card" key={item.id}>

                <img

                  src={

                    item.imagen ||

                    "https://images.unsplash.com/photo-1566073771259-6a8506099945"

                  }

                  alt={item.nombre}

                  loading="lazy"

                  onError={e => {

                    e.currentTarget.onerror = null;

                    e.currentTarget.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900";

                  }}

                />



                <div>

                  <span className="tag">{item.tipo}</span>

                  <h3>{item.nombre}</h3>

                  <p>{item.municipio}</p>

                  <p>{item.descripcion}</p>

                  <strong>Estado: {item.estado}</strong>



                  <div style={{

                    display: "flex",

                    gap: "10px",

                    flexWrap: "wrap",

                    marginTop: "12px"

                  }}>

                    <button

                      type="button"

                      className="admin"

                      onClick={() => prepararEdicionEstablecimiento(item)}

                    >

                      Editar establecimiento

                    </button>



                    <button

                      type="button"

                      onClick={() => eliminarEstablecimiento(item)}

                    >

                      Eliminar establecimiento

                    </button>

                  </div>



                  <button

                    className="admin"

                    onClick={() => abrirHabitaciones(item)}

                  >

                    Administrar habitaciones

                  </button>

                </div>

              </article>

            ))}

          </div>

        </section>



        {/* HABITACIONES */}

        <section className="dashboard-section" id="habitaciones">

          <h2>Administración de habitaciones</h2>



          {!alojamientoSeleccionado && (

            <div className="dashboard-empty">

              <span>🛏️</span>

              <h3>Selecciona un alojamiento</h3>

              <p>

                Pulsa Administrar habitaciones en uno de tus establecimientos.

              </p>

            </div>

          )}



          {alojamientoSeleccionado && (

            <>

              <h3>{alojamientoSeleccionado.nombre}</h3>

              <p>{alojamientoSeleccionado.municipio}</p>



              {errorHabitacion && (

                <p className="auth-error">{errorHabitacion}</p>

              )}



              {mensajeHabitacion && <p>{mensajeHabitacion}</p>}



              {!mostrarFormulario && (

                <button

                  className="admin"

                  onClick={() => {

                    setFormHabitacion(formularioInicial);

                    setEditando(false);

                    setHabitacionEditando(null);

                    setMostrarFormulario(true);

                    setErrorHabitacion("");

                  }}

                >

                  Agregar habitación

                </button>

              )}



              {mostrarFormulario && (

                <form

                  onSubmit={guardarHabitacion}

                  className="form-habitacion"

                >

                  <h3>

                    {editando ? "Editar habitación" : "Nueva habitación"}

                  </h3>



                  <label>Nombre de la habitación</label>

                  <input

                    name="nombre"

                    value={formHabitacion.nombre}

                    onChange={actualizarHabitacion}

                    required

                  />



                  <label>Descripción</label>

                  <textarea

                    name="descripcion"

                    value={formHabitacion.descripcion}

                    onChange={actualizarHabitacion}

                  />



                  <label>Capacidad de huéspedes</label>

                  <input

                    type="number"

                    name="capacidad"

                    min="1"

                    value={formHabitacion.capacidad}

                    onChange={actualizarHabitacion}

                    required

                  />



                  <label>Cantidad de habitaciones</label>

                  <input

                    type="number"

                    name="cantidad"

                    min="1"

                    value={formHabitacion.cantidad}

                    onChange={actualizarHabitacion}

                    required

                  />



                  <label>Precio por noche (COP)</label>

                  <input

                    type="number"

                    name="precio_noche"

                    min="1"

                    value={formHabitacion.precio_noche}

                    onChange={actualizarHabitacion}

                    required

                  />



                  {editando && (

                    <>

                      <label>Estado</label>

                      <select

                        name="estado"

                        value={formHabitacion.estado}

                        onChange={actualizarHabitacion}

                      >

                        <option value="disponible">Disponible</option>

                        <option value="inactivo">Inactivo</option>

                      </select>

                    </>

                  )}



                  <button type="submit" disabled={guardandoHabitacion}>

                    {guardandoHabitacion

                      ? "Guardando..."

                      : editando

                      ? "Guardar cambios"

                      : "Registrar habitación"}

                  </button>



                  <button type="button" onClick={cancelarFormulario}>

                    Cancelar

                  </button>

                </form>

              )}



              <h3>Habitaciones registradas</h3>



              {habitaciones.length === 0 ? (

                <p>

                  Este alojamiento todavía no tiene habitaciones registradas.

                </p>

              ) : (

                <div className="grid">

                  {habitaciones.map(habitacion => (

                    <article className="card" key={habitacion.id}>

                      <div>

                        <h3>{habitacion.nombre}</h3>

                        <p>{habitacion.descripcion}</p>

                        <p>

                          Capacidad: {habitacion.capacidad} huéspedes

                        </p>

                        <p>Cantidad: {habitacion.cantidad}</p>

                        <strong>

                          ${formatearPrecio(habitacion.precio_noche)} COP por noche

                        </strong>

                        <p>Estado: {habitacion.estado}</p>



                        <button

                          className="admin"

                          onClick={() => prepararEdicion(habitacion)}

                        >

                          Editar

                        </button>



                        <button

                          type="button"

                          onClick={() => eliminarHabitacion(habitacion)}

                        >

                          Eliminar

                        </button>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </>

          )}

        </section>



        {/* NOTIFICACIONES DEL PROPIETARIO */}

        <section className="dashboard-section" id="notificaciones">

          <div style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            gap: "12px",

            flexWrap: "wrap"

          }}>

            <div>

              <h2>Notificaciones</h2>

              <p>Conoce las novedades sobre tus establecimientos.</p>

            </div>

            <button

              type="button"

              className="admin"

              onClick={cargarNotificaciones}

              disabled={cargandoNotificaciones}

            >

              {cargandoNotificaciones ? "Actualizando..." : "Actualizar notificaciones"}

            </button>

          </div>



          {errorNotificaciones && (

            <p className="auth-error">{errorNotificaciones}</p>

          )}



          {cargandoNotificaciones && <p>Cargando notificaciones...</p>}



          {!cargandoNotificaciones && notificaciones.length === 0 && !errorNotificaciones && (

            <div className="dashboard-empty">

              <span>🔔</span>

              <h3>No tienes notificaciones</h3>

              <p>Cuando el administrador revise tus establecimientos, recibirás un aviso aquí.</p>

            </div>

          )}



          <div className="grid">

            {notificaciones.map(notificacion => (

              <article className="card" key={notificacion.id}>

                <div>

                  <span className="tag">

                    {notificacion.tipo === "aprobacion" ? "APROBADO" :

                     notificacion.tipo === "rechazo" ? "RECHAZADO" : "INFORMACIÓN"}

                  </span>

                  {!Number(notificacion.leida) && (

                    <span style={{ marginLeft: "8px", fontWeight: "bold" }}>● Nueva</span>

                  )}

                  <h3>{notificacion.titulo}</h3>

                  <p>{notificacion.mensaje}</p>

                  {notificacion.nombre_alojamiento && (

                    <p><strong>Establecimiento:</strong> {notificacion.nombre_alojamiento}</p>

                  )}

                  {notificacion.fecha && (

                    <p><small>{new Date(notificacion.fecha).toLocaleString("es-CO")}</small></p>

                  )}

                  {!Number(notificacion.leida) && (

                    <button

                      type="button"

                      className="admin"

                      onClick={() => marcarNotificacionLeida(notificacion.id)}

                    >

                      Marcar como leída

                    </button>

                  )}

                </div>

              </article>

            ))}

          </div>

        </section>



        {/* NUEVO: SOLICITUDES DE RESERVA */}

        <section className="dashboard-section" id="reservas">

          <div style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            gap: "12px",

            flexWrap: "wrap"

          }}>

            <h2>Solicitudes de reserva</h2>



            <button

              className="admin"

              onClick={cargarReservas}

              disabled={cargandoReservas}

            >

              {cargandoReservas ? "Actualizando..." : "Actualizar solicitudes"}

            </button>

          </div>



          {mensajeReserva && (

            <p className="auth-success">{mensajeReserva}</p>

          )}



          {errorReservas && (

            <p className="auth-error">{errorReservas}</p>

          )}



          {cargandoReservas && <p>Cargando solicitudes...</p>}



          {!cargandoReservas && reservas.length === 0 && !errorReservas && (

            <div className="dashboard-empty">

              <span>📋</span>

              <h3>No tienes solicitudes de reserva</h3>

              <p>

                Cuando un turista reserve una habitación, su solicitud aparecerá aquí.

              </p>

            </div>

          )}



          <div className="grid">

            {reservas.map(reserva => (

              <article className="card" key={reserva.id}>

                <div>

                  <span className="tag">

                    {reserva.estado.toUpperCase()}

                  </span>



                  <h3>{reserva.alojamiento_nombre}</h3>



                  <p>

                    <strong>Habitación:</strong> {reserva.habitacion_nombre}

                  </p>



                  <p>

                    <strong>Turista:</strong> {reserva.turista_nombre}

                  </p>



                  <p>

                    <strong>Correo:</strong> {reserva.turista_correo}

                  </p>



                  <p>

                    <strong>Teléfono:</strong>{" "}

                    {reserva.turista_telefono || "No registrado"}

                  </p>



                  <p>

                    <strong>Entrada:</strong>{" "}

                    {formatearFecha(reserva.fecha_entrada)}

                  </p>



                  <p>

                    <strong>Salida:</strong>{" "}

                    {formatearFecha(reserva.fecha_salida)}

                  </p>



                  <p>

                    <strong>Huéspedes:</strong>{" "}

                    {reserva.cantidad_huespedes}

                  </p>



                  <p>

                    <strong>Observaciones:</strong>{" "}

                    {reserva.observaciones || "Sin observaciones"}

                  </p>



                  <h3>

                    ${formatearPrecio(reserva.precio_total)} COP

                  </h3>



                  {reserva.estado === "pendiente" && (

                    <div style={{

                      display: "flex",

                      gap: "10px",

                      flexWrap: "wrap",

                      marginTop: "15px"

                    }}>

                      <button

                        className="admin"

                        disabled={procesandoReserva === reserva.id}

                        onClick={() =>

                          cambiarEstadoReserva(reserva, "aceptada")

                        }

                      >

                        {procesandoReserva === reserva.id

                          ? "Procesando..."

                          : "Aceptar reserva"}

                      </button>



                      <button

                        type="button"

                        disabled={procesandoReserva === reserva.id}

                        onClick={() =>

                          cambiarEstadoReserva(reserva, "rechazada")

                        }

                      >

                        Rechazar reserva

                      </button>

                    </div>

                  )}



                  {reserva.estado === "aceptada" && (

                    <p>

                      <strong>Reserva confirmada.</strong>

                    </p>

                  )}



                  {reserva.estado === "rechazada" && (

                    <p>

                      <strong>Esta solicitud fue rechazada.</strong>

                    </p>

                  )}



                  {reserva.estado === "cancelada" && (

                    <p>

                      <strong>Esta reserva fue cancelada por el turista.</strong>

                    </p>

                  )}

                </div>

              </article>

            ))}

          </div>

        </section>

      </main>

    </div>

  );

}
