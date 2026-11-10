import Admin from "./Admin";
import { useEffect, useState } from "react";
import "./App.css";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardTurista from "./pages/DashboardTurista";
import DashboardPropietario from "./pages/DashboardPropietario";

const GATEWAY = import.meta.env.VITE_API_URL || "http://localhost:3000";
const BUSCADOR = `${GATEWAY}/api/buscar`;

const categorias = [
  { nombre: "Destinos", descripcion: "Playas, islas y lugares turísticos", endpoint: "/api/destinos", ruta: "/destinos" },
  { nombre: "Hoteles", descripcion: "Alojamientos del Golfo", endpoint: "/api/alojamientos", ruta: "/alojamientos" },
  { nombre: "Gastronomía", descripcion: "Restaurantes y sabores", endpoint: "/api/gastronomia", ruta: "/gastronomia" },
  { nombre: "Experiencias", descripcion: "Tours y actividades", endpoint: "/api/experiencias", ruta: "/experiencias" },
  { nombre: "Eventos", descripcion: "Agenda turística", endpoint: "/api/eventos", ruta: "/eventos" }
];

function Tarjeta({ item, tipo, onSelect }) {
  return (
    <article className="card" onClick={() => onSelect(item, tipo)} style={{ cursor: "pointer" }}>
      <img
        src={item.imagen || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"}
        alt={item.nombre || tipo}
        loading="lazy"
      />
      <div>
        <span className="tag">{tipo}</span>
        <h3>{item.nombre || "Sin nombre"}</h3>
        <p>{item.municipio || ""}</p>
        <p>{item.descripcion || item.especialidad || item.tipo || ""}</p>
        <strong>Ver detalles →</strong>
      </div>
    </article>
  );
}

function App() {
  const location = useLocation();
  const rutaActual = location.pathname;
  const categoriaActual = categorias.find(c => c.ruta === rutaActual);
  const esInicio = rutaActual === "/";
  const esCategorias = rutaActual === "/categorias";
  const esBuscar = rutaActual === "/buscar";
  const esDestinos = rutaActual === "/destinos";

  const [destinos, setDestinos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [datosCategoria, setDatosCategoria] = useState([]);
  const [cargandoCategoria, setCargandoCategoria] = useState(false);
  const [error, setError] = useState("");
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");

  useEffect(() => {
    async function cargarDestinos() {
      try {
        const response = await fetch(`${GATEWAY}/api/destinos`);
        if (!response.ok) throw new Error("No se pudieron cargar los destinos");
        const data = await response.json();
        setDestinos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los destinos.");
      }
    }
    cargarDestinos();
  }, []);

  useEffect(() => {
    if (!categoriaActual) {
      setDatosCategoria([]);
      return;
    }

    let cancelado = false;
    async function cargarCategoria() {
      setCargandoCategoria(true);
      setDatosCategoria([]);
      setError("");
      try {
        const response = await fetch(`${GATEWAY}${categoriaActual.endpoint}`);
        if (!response.ok) throw new Error("Error al consultar la categoría");
        const data = await response.json();
        const lista = Array.isArray(data) ? data : data.data || data.resultados || data.rows || [];
        const filtrada = categoriaActual.endpoint === "/api/alojamientos"
          ? lista.filter(item => String(item.estado || "").trim().toLowerCase() === "publicado")
          : lista;
        if (!cancelado) setDatosCategoria(filtrada);
      } catch (err) {
        console.error(err);
        if (!cancelado) setError(`No se pudieron cargar ${categoriaActual.nombre}.`);
      } finally {
        if (!cancelado) setCargandoCategoria(false);
      }
    }
    cargarCategoria();
    return () => { cancelado = true; };
  }, [rutaActual]);

  async function buscar(event) {
    event.preventDefault();
    if (!busqueda.trim()) {
      setResultados([]);
      return;
    }
    setCargando(true);
    setError("");
    setResultados([]);
    try {
      const params = new URLSearchParams({ q: busqueda.trim() });
      const response = await fetch(`${BUSCADOR}/api/buscar?${params}`);
      if (!response.ok) throw new Error("Error consultando el buscador");
      const data = await response.json();
      const lista = data.resultados || data.results || data.hits?.hits || data.hits || [];
      setResultados(lista.map(item => item._source || item));
    } catch (err) {
      console.error(err);
      setError("No se pudo realizar la búsqueda.");
    } finally {
      setCargando(false);
    }
  }

  function seleccionarElemento(item, tipo) {
    setElementoSeleccionado(item);
    setTipoSeleccionado(tipo);
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="marca-sitio">Golfo Sucre</Link>
        <div className="navbar-links">
          <Link to="/">Inicio</Link>
          <Link to="/destinos">Destinos</Link>
          <Link to="/categorias">Categorías</Link>
          <Link to="/buscar">Buscar</Link>
        </div>
        <div className="nav-auth">
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/registro" className="admin">Crear cuenta</Link>
        </div>
      </nav>

      {esInicio && (
        <>
          <section className="hero" id="inicio">
            <div className="hero-text">
              <h1>El Golfo de Morrosquillo, a un clic.</h1>
              <p>Consulta playas, hoteles, restaurantes, experiencias y eventos del Golfo en un solo lugar.</p>
              <form onSubmit={event => { buscar(event); }} className="search">
                <input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Busca un destino, playa o experiencia..." />
                <button type="submit">Buscar</button>
              </form>
            </div>
            <img
              src="/images/golfo-morrosquillo.jpg"
              alt="Golfo de Morrosquillo"
              onError={event => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";
              }}
            />
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>Destinos destacados</h2>
              <Link className="enlace-explorar" to="/destinos">Ver todos →</Link>
            </div>
            <div className="grid">
              {destinos.slice(0, 4).map(destino => (
                <Tarjeta key={destino.id} item={destino} tipo="Destino" onSelect={seleccionarElemento} />
              ))}
            </div>
          </section>

          <section className="section categories">
            <div className="section-heading">
              <h2>Explora por categoría</h2>
              <Link className="enlace-explorar" to="/categorias">Ver categorías →</Link>
            </div>
            <div className="grid">
              {categorias.map(categoria => (
                <Link className="category-card" key={categoria.nombre} to={categoria.ruta}>
                  <h3>{categoria.nombre}</h3>
                  <p>{categoria.descripcion}</p>
                  <span>Explorar →</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {esCategorias && (
        <main className="section pagina-catalogo">
          <div className="encabezado-pagina">
            <span className="tag">SUCRE TURÍSTICO</span>
            <h1>Explora por categoría</h1>
            <p>Selecciona una categoría para descubrir todo lo que ofrece el Golfo de Morrosquillo.</p>
          </div>
          <div className="grid">
            {categorias.map(categoria => (
              <Link className="category-card" key={categoria.nombre} to={categoria.ruta}>
                <h3>{categoria.nombre}</h3>
                <p>{categoria.descripcion}</p>
                <span>Explorar →</span>
              </Link>
            ))}
          </div>
        </main>
      )}

      {(categoriaActual || esDestinos) && (
        <main className="section pagina-catalogo">
          <div className="section-heading">
            <div>
              <span className="tag">SUCRE TURÍSTICO</span>
              <h1>{esDestinos ? "Destinos del Golfo" : categoriaActual.nombre}</h1>
              <p>{esDestinos ? "Descubre playas, islas y lugares turísticos de la región." : categoriaActual.descripcion}</p>
            </div>
            <Link to="/categorias" className="enlace-explorar">← Todas las categorías</Link>
          </div>
          {error && <p className="error">{error}</p>}
          {cargandoCategoria && <p>Cargando información...</p>}
          {!cargandoCategoria && !error && (
            (esDestinos ? destinos : datosCategoria).length === 0
              ? <p>No hay registros disponibles en esta categoría.</p>
              : <div className="grid">
                  {(esDestinos ? destinos : datosCategoria).map(item => (
                    <Tarjeta
                      key={item.id}
                      item={item}
                      tipo={esDestinos ? "Destino" : categoriaActual.nombre}
                      onSelect={seleccionarElemento}
                    />
                  ))}
                </div>
          )}
        </main>
      )}

      {esBuscar && (
        <main className="section pagina-catalogo">
          <div className="encabezado-pagina">
            <span className="tag">SUCRE TURÍSTICO</span>
            <h1>Buscar en el Golfo de Morrosquillo</h1>
            <p>Encuentra destinos, alojamientos, restaurantes y experiencias.</p>
          </div>
          <form onSubmit={buscar} className="search buscador-pagina">
            <input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="¿Qué te gustaría encontrar?" />
            <button type="submit">Buscar</button>
          </form>
          {cargando && <p>Buscando información...</p>}
          {error && <p className="error">{error}</p>}
          {!cargando && resultados.length > 0 && (
            <>
              <h2>Resultados de búsqueda</h2>
              <div className="grid">
                {resultados.map((item, index) => (
                  <Tarjeta key={item.id || index} item={item} tipo={item.tipo_contenido || item.categoria || "Resultado"} onSelect={seleccionarElemento} />
                ))}
              </div>
            </>
          )}
          {!cargando && busqueda && resultados.length === 0 && !error && <p>No encontramos resultados para tu búsqueda.</p>}
        </main>
      )}

      {elementoSeleccionado && (
        <div className="modal-fondo" onClick={() => setElementoSeleccionado(null)}>
          <div className="modal-detalle" onClick={event => event.stopPropagation()}>
            <button className="cerrar-modal" onClick={() => setElementoSeleccionado(null)}>✕</button>
            <img src={elementoSeleccionado.imagen || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"} alt={elementoSeleccionado.nombre} />
            <span className="tag">{tipoSeleccionado}</span>
            <h2>{elementoSeleccionado.nombre}</h2>
            <p><strong>Municipio:</strong> {elementoSeleccionado.municipio || "No especificado"}</p>
            <p><strong>Descripción:</strong> {elementoSeleccionado.descripcion || "Sin descripción"}</p>
            {elementoSeleccionado.tipo && <p><strong>Tipo:</strong> {elementoSeleccionado.tipo}</p>}
            {elementoSeleccionado.especialidad && <p><strong>Especialidad:</strong> {elementoSeleccionado.especialidad}</p>}
            {elementoSeleccionado.fecha && <p><strong>Fecha:</strong> {elementoSeleccionado.fecha}</p>}
            <button className="admin" onClick={() => setElementoSeleccionado(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <footer>Sucre Turístico — Electiva Profesional II</footer>
    </>
  );
}

function Root() {
  return (
    <Routes>
      <Route path="/*" element={<App />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/turista" element={<DashboardTurista />} />
      <Route path="/propietario" element={<DashboardPropietario />} />
      <Route path="*" element={<h1>Página no encontrada</h1>} />
    </Routes>
  );
}

export default Root;
