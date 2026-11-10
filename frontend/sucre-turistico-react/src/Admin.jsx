import { useEffect, useState } from "react";
import "./Admin.css";
import { obtenerToken } from "./services/authService";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const modulos = {
  destinos: {
    titulo: "Destinos",
    endpoint: "/api/destinos",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "municipio", etiqueta: "Municipio", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "tipo", etiqueta: "Tipo", requerido: true },
      { nombre: "imagen", etiqueta: "URL de imagen" },
      { nombre: "coordenadas", etiqueta: "Coordenadas" },
      { nombre: "estado", etiqueta: "Estado", tipo: "estado" }
    ]
  },
  alojamientos: {
    titulo: "Alojamientos",
    endpoint: "/api/alojamientos",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "municipio", etiqueta: "Municipio", requerido: true },
      { nombre: "tipo", etiqueta: "Tipo", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "imagen", etiqueta: "URL de imagen" },
      { nombre: "estado", etiqueta: "Estado", tipo: "estado" }
    ]
  },
  gastronomia: {
    titulo: "Gastronomía",
    endpoint: "/api/gastronomia",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "municipio", etiqueta: "Municipio", requerido: true },
      { nombre: "especialidad", etiqueta: "Especialidad", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "imagen", etiqueta: "URL de imagen" },
      { nombre: "estado", etiqueta: "Estado", tipo: "estado" }
    ]
  },
  experiencias: {
    titulo: "Experiencias",
    endpoint: "/api/experiencias",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "municipio", etiqueta: "Municipio", requerido: true },
      { nombre: "tipo", etiqueta: "Tipo", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "imagen", etiqueta: "URL de imagen" },
      { nombre: "estado", etiqueta: "Estado", tipo: "estado" }
    ]
  },
  eventos: {
    titulo: "Eventos",
    endpoint: "/api/eventos",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", requerido: true },
      { nombre: "municipio", etiqueta: "Municipio", requerido: true },
      { nombre: "fecha", etiqueta: "Fecha", tipo: "date", requerido: true },
      { nombre: "tipo", etiqueta: "Tipo", requerido: true },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
      { nombre: "imagen", etiqueta: "URL de imagen" },
      { nombre: "estado", etiqueta: "Estado", tipo: "estado" }
    ]
  }
};

async function leerRespuesta(respuesta) {
  const texto = await respuesta.text();
  if (!texto) return {};

  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}

function Admin() {
  const [modulo, setModulo] = useState("destinos");
  const [registros, setRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState({});
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [alojamientoDetalle, setAlojamientoDetalle] = useState(null);

  const actual = modulos[modulo];
  const esUsuarios = modulo === "usuarios";
  const esAlojamientos = modulo === "alojamientos";

  const encabezadosAuth = {
    Authorization: `Bearer ${obtenerToken()}`,
    "Content-Type": "application/json"
  };

  async function cargarRegistros() {
    if (!actual) return;

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(`${API}${actual.endpoint}`, {
        headers: { Authorization: `Bearer ${obtenerToken()}` }
      });
      const datos = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.error || datos.mensaje || "No se pudieron cargar los registros");
      }

      setRegistros(Array.isArray(datos) ? datos : datos.alojamientos || datos.registros || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function cargarUsuarios() {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(
        `${API}/api/usuarios/admin/listar`,
        { headers: encabezadosAuth }
      );

      const datos = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.error || datos.mensaje || "No se pudieron cargar los usuarios");
      }

      const lista = Array.isArray(datos) ? datos : datos.usuarios || [];
      setUsuarios(lista);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setFormulario({});
    setEditando(null);
    setMensaje("");
    setError("");
    setAlojamientoDetalle(null);

    if (modulo === "usuarios") {
      cargarUsuarios();
    } else {
      cargarRegistros();
    }
  }, [modulo]);

  function cambiarCampo(nombre, valor) {
    setFormulario(prev => ({ ...prev, [nombre]: valor }));
  }

  function nuevoRegistro() {
    setFormulario({ estado: "Publicado" });
    setEditando(null);
    setMensaje("");
    setError("");
  }

  function editarRegistro(registro) {
    const datos = { ...registro };

    if (datos.fecha) {
      datos.fecha = String(datos.fecha).slice(0, 10);
    }

    setFormulario(datos);
    setEditando(registro.id);
    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarRegistro(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const metodo = editando ? "PUT" : "POST";
    const url = editando
      ? `${API}${actual.endpoint}/${editando}`
      : `${API}${actual.endpoint}`;

    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: encabezadosAuth,
        body: JSON.stringify(formulario)
      });

      const resultado = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.mensaje || "No se pudo guardar el registro");
      }

      setMensaje(editando
        ? "Registro actualizado correctamente."
        : "Registro creado correctamente.");

      setFormulario({});
      setEditando(null);
      await cargarRegistros();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminarRegistro(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este registro?")) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API}${actual.endpoint}/${id}`, {
        method: "DELETE",
        headers: encabezadosAuth
      });

      const resultado = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.mensaje || "No se pudo eliminar");
      }

      setMensaje("Registro eliminado correctamente.");
      await cargarRegistros();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstadoAlojamiento(alojamiento, nuevoEstado) {
    const accion = nuevoEstado === "Publicado" ? "aprobar" : "rechazar";

    if (!window.confirm(`¿Deseas ${accion} "${alojamiento.nombre}"?`)) return;

    setError("");
    setMensaje("");

    try {
      // Se conserva el resto de los datos para que el servicio no sobrescriba
      // accidentalmente nombre, descripción, imagen o propietario.
      const respuesta = await fetch(
        `${API}/api/alojamientos/${alojamiento.id}`,
        {
          method: "PUT",
          headers: encabezadosAuth,
          body: JSON.stringify({
            ...alojamiento,
            estado: nuevoEstado
          })
        }
      );

      const resultado = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.mensaje || `No se pudo ${accion} el alojamiento`);
      }

      setMensaje(
        nuevoEstado === "Publicado"
          ? "Alojamiento aprobado y publicado correctamente."
          : "Alojamiento rechazado correctamente."
      );
      setAlojamientoDetalle(null);
      await cargarRegistros();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarRol(usuario, nuevoRol) {
    if (usuario.rol === "administrador") return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        `${API}/api/usuarios/admin/${usuario.id}/rol`,
        {
          method: "PATCH",
          headers: encabezadosAuth,
          body: JSON.stringify({ rol: nuevoRol })
        }
      );

      const resultado = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.mensaje || "No se pudo cambiar el rol");
      }

      setMensaje("Rol actualizado correctamente.");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(usuario) {
    if (usuario.rol === "administrador") return;

    const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";

    if (!window.confirm(
      `¿Seguro que deseas ${nuevoEstado === "activo" ? "activar" : "desactivar"} esta cuenta?`
    )) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        `${API}/api/usuarios/admin/${usuario.id}/estado`,
        {
          method: "PATCH",
          headers: encabezadosAuth,
          body: JSON.stringify({ estado: nuevoEstado })
        }
      );

      const resultado = await leerRespuesta(respuesta);

      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.mensaje || "No se pudo cambiar el estado");
      }

      setMensaje("Estado de la cuenta actualizado correctamente.");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  }

  const total = esUsuarios ? usuarios.length : registros.length;
  const pendientes = esAlojamientos
    ? registros.filter(r => String(r.estado || "").toLowerCase() === "borrador")
    : [];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Golfo Sucre</h2>
        <p>Panel de administración</p>

        <nav>
          {Object.entries(modulos).map(([clave, item]) => (
            <button
              key={clave}
              className={modulo === clave ? "admin-nav activo" : "admin-nav"}
              onClick={() => setModulo(clave)}
            >
              {item.titulo}
              {clave === "alojamientos" && pendientes.length > 0 && (
                <span className="admin-pending-count">{pendientes.length}</span>
              )}
            </button>
          ))}

          <button
            className={modulo === "usuarios" ? "admin-nav activo" : "admin-nav"}
            onClick={() => setModulo("usuarios")}
          >
            Usuarios
          </button>
        </nav>

        <a href="/">← Volver al sitio</a>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Administración</h1>
            <p>Gestiona el contenido y los usuarios de Sucre Turístico.</p>
          </div>
          <span className="admin-count">{total} registros</span>
        </header>

        {mensaje && <div className="admin-success">{mensaje}</div>}
        {error && <div className="admin-error">{error}</div>}

        {esUsuarios ? (
          <section className="admin-table-card">
            <div className="admin-section-title">
              <h2>Gestión de usuarios</h2>
              <button type="button" onClick={cargarUsuarios}>Actualizar lista</button>
            </div>

            {cargando ? (
              <p>Cargando usuarios...</p>
            ) : usuarios.length === 0 ? (
              <p>No hay usuarios registrados.</p>
            ) : (
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(usuario => (
                      <tr key={usuario.id}>
                        <td>{usuario.id}</td>
                        <td>{usuario.nombre}</td>
                        <td>{usuario.correo}</td>
                        <td>{usuario.telefono || "No registrado"}</td>
                        <td>
                          {usuario.rol === "administrador" ? (
                            <strong>Administrador</strong>
                          ) : (
                            <select
                              value={usuario.rol}
                              onChange={e => cambiarRol(usuario, e.target.value)}
                            >
                              <option value="turista">Turista</option>
                              <option value="propietario">Propietario</option>
                            </select>
                          )}
                        </td>
                        <td>{usuario.estado}</td>
                        <td>
                          {usuario.rol === "administrador" ? (
                            <span>Cuenta protegida</span>
                          ) : (
                            <button type="button" onClick={() => cambiarEstado(usuario)}>
                              {usuario.estado === "activo" ? "Desactivar" : "Activar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <>
            {esAlojamientos && (
              <section className="admin-table-card">
                <div className="admin-section-title">
                  <div>
                    <h2>Solicitudes de propietarios</h2>
                    <p>Revisa los establecimientos enviados para aprobación.</p>
                  </div>
                  <button type="button" onClick={cargarRegistros}>Actualizar solicitudes</button>
                </div>

                {pendientes.length === 0 ? (
                  <p>No hay alojamientos pendientes de revisión.</p>
                ) : (
                  <div className="admin-review-grid">
                    {pendientes.map(item => (
                      <article className="admin-review-card" key={item.id}>
                        {item.imagen ? (
                          <img src={item.imagen} alt={item.nombre} />
                        ) : (
                          <div className="admin-no-image">Sin fotografía</div>
                        )}
                        <div className="admin-review-content">
                          <span className="admin-status-pending">Pendiente de revisión</span>
                          <h3>{item.nombre}</h3>
                          <p><strong>Municipio:</strong> {item.municipio}</p>
                          <p><strong>Tipo:</strong> {item.tipo}</p>
                          <p>{item.descripcion || "Sin descripción."}</p>
                          <div className="admin-review-actions">
                            <button type="button" onClick={() => setAlojamientoDetalle(item)}>
                              Ver detalles
                            </button>
                            <button
                              type="button"
                              className="admin-approve"
                              onClick={() => cambiarEstadoAlojamiento(item, "Publicado")}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              className="admin-reject"
                              onClick={() => cambiarEstadoAlojamiento(item, "Rechazado")}
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="admin-form-card">
              <div className="admin-section-title">
                <h2>{editando ? "Editar registro" : `Nuevo registro: ${actual.titulo}`}</h2>
                <button type="button" onClick={nuevoRegistro}>Limpiar</button>
              </div>

              <form onSubmit={guardarRegistro}>
                <div className="admin-fields">
                  {actual.campos.map(campo => (
                    <label key={campo.nombre}>
                      {campo.etiqueta}
                      {campo.tipo === "textarea" ? (
                        <textarea
                          required={campo.requerido}
                          value={formulario[campo.nombre] || ""}
                          onChange={e => cambiarCampo(campo.nombre, e.target.value)}
                        />
                      ) : campo.tipo === "estado" ? (
                        <select
                          value={formulario.estado || "Publicado"}
                          onChange={e => cambiarCampo("estado", e.target.value)}
                        >
                          <option value="Publicado">Publicado</option>
                          <option value="Borrador">Borrador</option>
                          <option value="Rechazado">Rechazado</option>
                        </select>
                      ) : (
                        <input
                          type={campo.tipo || "text"}
                          required={campo.requerido}
                          value={formulario[campo.nombre] || ""}
                          onChange={e => cambiarCampo(campo.nombre, e.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>

                <div className="admin-actions">
                  <button type="submit" className="admin-save">
                    {editando ? "Guardar cambios" : "Crear registro"}
                  </button>
                  {editando && (
                    <button type="button" onClick={nuevoRegistro}>Cancelar edición</button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-table-card">
              <h2>Registros de {actual.titulo}</h2>

              {cargando ? (
                <p>Cargando registros...</p>
              ) : registros.length === 0 ? (
                <p>No hay registros disponibles.</p>
              ) : (
                <div className="admin-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Municipio</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map(registro => (
                        <tr key={registro.id}>
                          <td>{registro.id}</td>
                          <td>{registro.nombre}</td>
                          <td>{registro.municipio}</td>
                          <td>{registro.estado || "Publicado"}</td>
                          <td>
                            <div className="admin-row-actions">
                              <button type="button" onClick={() => editarRegistro(registro)}>
                                Editar
                              </button>
                              <button type="button" onClick={() => eliminarRegistro(registro.id)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {alojamientoDetalle && (
        <div className="admin-modal-backdrop" onClick={() => setAlojamientoDetalle(null)}>
          <section className="admin-review-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setAlojamientoDetalle(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            {alojamientoDetalle.imagen && (
              <img src={alojamientoDetalle.imagen} alt={alojamientoDetalle.nombre} />
            )}
            <h2>{alojamientoDetalle.nombre}</h2>
            <p><strong>Municipio:</strong> {alojamientoDetalle.municipio}</p>
            <p><strong>Tipo:</strong> {alojamientoDetalle.tipo}</p>
            <p><strong>Descripción:</strong> {alojamientoDetalle.descripcion || "Sin descripción."}</p>
            <p><strong>Estado:</strong> {alojamientoDetalle.estado}</p>
            <div className="admin-review-actions">
              <button
                type="button"
                className="admin-approve"
                onClick={() => cambiarEstadoAlojamiento(alojamientoDetalle, "Publicado")}
              >
                Aprobar y publicar
              </button>
              <button
                type="button"
                className="admin-reject"
                onClick={() => cambiarEstadoAlojamiento(alojamientoDetalle, "Rechazado")}
              >
                Rechazar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Admin;
