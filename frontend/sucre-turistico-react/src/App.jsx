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

const diapositivas = [
  { titulo: "El Caribe tiene un lugar para ti.", resaltado: "Descubre Sucre.", texto: "Playas de ensueño, pueblos con historia y experiencias que se quedan contigo.", imagen: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=85", lugar: "Golfo de Morrosquillo" },
  { titulo: "Donde el mar se encuentra", resaltado: "con la tranquilidad.", texto: "Déjate llevar por el azul del Caribe y encuentra tu próximo destino.", imagen: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=2200&q=85", lugar: "Playas del Caribe" },
  { titulo: "Hay historias que empiezan", resaltado: "con un viaje.", texto: "Explora los paisajes, sabores y rincones que hacen único a nuestro territorio.", imagen: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=2200&q=85", lugar: "Naturaleza y aventura" }
];
const imagenesCategoria = {
  Destinos: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  Hoteles: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
  Gastronomía: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  Experiencias: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
  Eventos: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80"
};

// Fotografías que rotan automáticamente en cada portada de categoría.
const fondosPortada = {
  Destinos: [imagenesCategoria.Destinos, "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=2000&q=85", "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=2000&q=85"],
  Hoteles: [imagenesCategoria.Hoteles, "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2000&q=85", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=85"],
  Gastronomía: [imagenesCategoria.Gastronomía, "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=85", "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=2000&q=85"],
  Experiencias: [imagenesCategoria.Experiencias, "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=2000&q=85", "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2000&q=85"],
  Eventos: [imagenesCategoria.Eventos, "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=2000&q=85", "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=2000&q=85"]
};

function PortadaRotativa({ categoria, children, interior = false }) {
  const [indice, setIndice] = useState(0);
  const fotos = categoria === "Todas" ? [imagenesCategoria.Destinos, imagenesCategoria.Experiencias, imagenesCategoria.Hoteles] : fondosPortada[categoria] || fondosPortada.Destinos;
  useEffect(() => {
    setIndice(0);
    const timer = window.setInterval(() => setIndice(i => (i + 1) % fotos.length), 5000);
    return () => window.clearInterval(timer);
  }, [categoria]);
  return <section className={`catalogo-portada portada-rotativa ${interior ? "catalogo-portada-interior" : ""}`}>
    {fotos.map((foto, i) => <div key={`${categoria}-${i}`} className={`portada-rotativa-foto ${indice === i ? "activa" : ""}`} style={{ backgroundImage: `url("${foto}")` }} aria-hidden="true" />)}
    <div className="portada-rotativa-sombra" aria-hidden="true" />
    {children}
    <div className="portada-rotativa-puntos" aria-label="Seleccionar fotografía">
      {fotos.map((_, i) => <button type="button" key={i} className={i === indice ? "activo" : ""} aria-label={`Fotografía ${i+1}`} onClick={() => setIndice(i)} />)}
    </div>
  </section>;
}

function TarjetaCategoria({ categoria }) {
  return <Link className="category-card category-photo" to={categoria.ruta} style={{ backgroundImage: `linear-gradient(180deg, transparent 15%, rgba(5, 38, 42, .9)), url("${imagenesCategoria[categoria.nombre]}")` }}>
    <span className="category-kicker">EXPLORA SUCRE</span>
    <div><h3>{categoria.nombre}</h3><p>{categoria.descripcion}</p><span className="category-arrow" aria-hidden="true">↗</span></div>
  </Link>;
}

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

// Interpretar fechas de MySQL sin desplazamientos por zona horaria.
function fechaEvento(valor) {
  if (!valor) return null;
  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
function proximosEventos(lista) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return lista.filter(e => {
    const fecha = fechaEvento(e.fecha);
    return fecha && fecha >= hoy && !["inactivo", "cancelado", "borrador"].includes(String(e.estado || "").toLowerCase());
  }).sort((a, b) => fechaEvento(a.fecha) - fechaEvento(b.fecha));
}
function fechaLegible(valor) {
  const fecha = fechaEvento(valor);
  return fecha ? fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "Fecha por confirmar";
}

// Evento informativo de la organización: sin fecha oficial verificada.
const carreraDelGolfo = {
  id: "carrera-golfo-informativa",
  nombre: "Carrera del Golfo de Morrosquillo",
  municipio: "Golfo de Morrosquillo",
  descripcion: "Carrera atlética del Golfo de Morrosquillo. Consulta la organización para conocer la próxima edición, recorridos e inscripciones.",
  imagen: "https://images.unsplash.com/photo-1530143311094-34d807799e8f?auto=format&fit=crop&w=1200&q=85",
  enlaceOficial: "https://carreradelgolfo.com",
  fechaPorConfirmar: true
};
function incluirCarrera(lista) {
  const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return lista.some(item => normalizar(item.nombre).includes("carrera del golfo")) ? lista : [...lista, carreraDelGolfo];
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
  const [eventos, setEventos] = useState([]);
  const [errorEventos, setErrorEventos] = useState(false);
  const [slideActual, setSlideActual] = useState(0);
  const [sliderPausado, setSliderPausado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datosCategoria, setDatosCategoria] = useState([]);
  const [cargandoCategoria, setCargandoCategoria] = useState(false);
  const [error, setError] = useState("");
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");

  useEffect(() => {
    if (!esInicio || sliderPausado) return;
    const temporizador = setInterval(() => setSlideActual(actual => (actual + 1) % diapositivas.length), 5500);
    return () => clearInterval(temporizador);
  }, [esInicio, sliderPausado]);

  useEffect(() => {
    if (!elementoSeleccionado) return;
    const cerrarConEscape = (event) => { if (event.key === "Escape") setElementoSeleccionado(null); };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [elementoSeleccionado]);

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
    let activo = true;
    fetch(`${GATEWAY}/api/eventos`)
      .then(r => { if (!r.ok) throw new Error("Eventos no disponibles"); return r.json(); })
      .then(data => { if (activo) setEventos(Array.isArray(data) ? data : data.data || []); })
      .catch(() => { if (activo) setErrorEventos(true); });
    return () => { activo = false; };
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

  async function ejecutarBusqueda(termino) {
    const consulta = termino.trim();
    setBusqueda(consulta);
    if (!consulta) {
      setResultados([]);
      setBusquedaRealizada(false);
      setError("");
      return;
    }
    setBusquedaRealizada(true);
    setCargando(true);
    setError("");
    setResultados([]);
    try {
      // El gateway ya incluye /api/buscar: no duplicar esa ruta.
      const response = await fetch(`${BUSCADOR}?${new URLSearchParams({ q: consulta })}`);
      if (!response.ok) throw new Error(`Buscador: HTTP ${response.status}`);
      const data = await response.json();
      const lista = data.resultados || data.results || data.hits?.hits || data.hits || [];
      if (!Array.isArray(lista)) throw new Error("Formato de resultados inesperado");
      setResultados(lista.map(item => item._source || item));
    } catch (err) {
      console.error(err);
      setError("No se pudo consultar el buscador. Comprueba que el API Gateway (puerto 3000), el servicio de búsqueda (3006) y Elasticsearch estén encendidos.");
    } finally {
      setCargando(false);
    }
  }

  function buscar(event) {
    event.preventDefault();
    ejecutarBusqueda(busqueda);
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
          <section className="hero hero-slider" id="inicio" aria-label="Descubre Sucre" onMouseEnter={() => setSliderPausado(true)} onMouseLeave={() => setSliderPausado(false)}>
            {diapositivas.map((slide, index) => <div key={slide.lugar} className={`hero-slide ${slideActual === index ? "active" : ""}`} style={{ backgroundImage: `url("${slide.imagen}")` }} aria-hidden={slideActual !== index} />)}
            <div className="hero-shade" />
            <div className="hero-text">
              
              <h1 key={slideActual}>{diapositivas[slideActual].titulo}<br/><em>{diapositivas[slideActual].resaltado}</em></h1>
              <p>{diapositivas[slideActual].texto}</p>
              <div className="hero-actions"><Link to="/destinos" className="hero-cta">Explorar destinos <span>↗</span></Link><Link to="/categorias" className="hero-secondary">Conoce nuestras experiencias →</Link></div>
            </div>
            <div className="hero-bottom">
              <div className="hero-dots" aria-label="Seleccionar imagen del carrusel">{diapositivas.map((slide, index) => <button key={slide.lugar} type="button" className={index === slideActual ? "active" : ""} onClick={() => setSlideActual(index)} aria-label={`Mostrar imagen ${index + 1}: ${slide.lugar}`} aria-current={index === slideActual ? "true" : undefined} />)}</div>
              <span className="hero-place">⌖ {diapositivas[slideActual].lugar} · Sucre, Colombia</span>
              <div className="hero-arrows"><button type="button" aria-label="Imagen anterior" onClick={() => setSlideActual(actual => (actual - 1 + diapositivas.length) % diapositivas.length)}>←</button><button type="button" aria-label="Imagen siguiente" onClick={() => setSlideActual(actual => (actual + 1) % diapositivas.length)}>→</button></div>
            </div>
          </section>
          <div className="intro-strip"><span>☀️ <strong>Sol y playa</strong></span><span>🌿 <strong>Naturaleza</strong></span><span>🍽️ <strong>Sabores locales</strong></span><span>✧ <strong>Cultura viva</strong></span></div>

          <section className="section">
            <div className="section-heading">
              <div><span className="section-kicker">RINCONES QUE ENAMORAN</span><h2>Destinos destacados</h2><p className="section-subtitle">Descubre los lugares que hacen especial al Golfo de Morrosquillo.</p></div>
              <Link className="enlace-explorar" to="/destinos">Ver todos →</Link>
            </div>
            <div className="grid">
              {destinos.slice(0, 4).map(destino => (
                <Tarjeta key={destino.id} item={destino} tipo="Destino" onSelect={seleccionarElemento} />
              ))}
            </div>
          </section>

          <section className="section eventos-inicio" id="proximos-eventos">
            <div className="section-heading">
              <div><span className="section-kicker">AGENDA DEL GOLFO</span><h2>Próximos eventos</h2><p className="section-subtitle">Lo que está por suceder en nuestra región, ordenado por fecha.</p></div>
              <Link className="enlace-explorar" to="/eventos">Ver agenda completa →</Link>
            </div>
            <div className="eventos-grid">
              {incluirCarrera(proximosEventos(eventos).slice(0, 2)).map(evento => (
                <button type="button" className="evento-destacado" key={evento.id} onClick={() => seleccionarElemento(evento, "Evento")}>
                  <img src={evento.imagen || imagenesCategoria.Eventos} alt={evento.nombre} loading="lazy" />
                  <div className="evento-info"><span className="evento-fecha">{evento.fechaPorConfirmar ? "📅 Fecha por confirmar" : `📅 ${fechaLegible(evento.fecha)}`}</span><h3>{evento.nombre}</h3><p>⌖ {evento.municipio || "Golfo de Morrosquillo"}</p><span className="evento-ver">Conocer evento ↗</span></div>
                </button>
              ))}
            </div>
            {errorEventos && <p className="eventos-vacio">No se pudo cargar la agenda desde el servidor. La Carrera del Golfo se muestra como información independiente.</p>}
          </section>

          <section className="section categories">
            <div className="section-heading">
              <div><span className="section-kicker">TU VIAJE, A TU MANERA</span><h2>¿Qué quieres descubrir?</h2><p className="section-subtitle">Encuentra tu próxima aventura entre experiencias únicas.</p></div>
              <Link className="enlace-explorar" to="/categorias">Ver categorías →</Link>
            </div>
            <div className="grid">
              {categorias.map(categoria => (
                <TarjetaCategoria key={categoria.nombre} categoria={categoria} />
              ))}
            </div>
          </section>
        </>
      )}

      {esCategorias && (
        <main className="catalogo-pagina">
          <PortadaRotativa categoria="Todas">
            <div className="catalogo-portada-contenido">
              <span className="catalogo-sobretitulo">GOLFO DE MORROSQUILLO · COLOMBIA</span>
              <h1>Un mundo por <em>descubrir.</em></h1>
              <p>De la brisa del mar a los sabores de nuestra tierra. Elige cómo quieres vivir Sucre.</p>
              <a href="#explorar-categorias" className="catalogo-boton">Explorar categorías <span>↓</span></a>
            </div>
          </PortadaRotativa>
          <section className="catalogo-contenido" id="explorar-categorias">
            <div className="catalogo-intro"><span className="section-kicker">EXPLORA A TU RITMO</span><h2>Tu próxima historia empieza aquí</h2><p>Encuentra planes, lugares y experiencias para cada tipo de viajero.</p></div>
            <div className="grid catalogo-grid">
              {categorias.map(categoria => <TarjetaCategoria key={categoria.nombre} categoria={categoria} />)}
            </div>
          </section>
        </main>
      )}

      {(categoriaActual || esDestinos) && (
        <main className="catalogo-pagina">
          <PortadaRotativa categoria={esDestinos ? "Destinos" : categoriaActual.nombre} interior>
            <div className="catalogo-portada-contenido">
              <Link to="/categorias" className="catalogo-volver">← Todas las categorías</Link>
              <span className="catalogo-sobretitulo">DESCUBRE EL GOLFO DE MORROSQUILLO</span>
              <h1>{esDestinos ? "Destinos del Golfo" : categoriaActual.nombre}</h1>
              <p>{esDestinos ? "Playas, islas y rincones para perder la noción del tiempo." : categoriaActual.descripcion}</p>
            </div>
          </PortadaRotativa>
          <section className="catalogo-contenido">
            <div className="catalogo-intro"><span className="section-kicker">SELECCIONADO PARA TI</span><h2>{esDestinos ? "Lugares que vale la pena conocer" : `Descubre ${categoriaActual.nombre.toLowerCase()}`}</h2><p>Explora las opciones disponibles y encuentra tu próxima parada.</p></div>
            {error && <p className="error">{error}</p>}
            {categoriaActual?.nombre === "Eventos" && <p className="eventos-nota">Los próximos eventos aparecen primero. Los eventos pasados se muestran al final.</p>}
            {cargandoCategoria && <p>Cargando información...</p>}
            {!cargandoCategoria && !error && (
              (esDestinos ? destinos : categoriaActual?.nombre === "Eventos" ? incluirCarrera(datosCategoria) : datosCategoria).length === 0
                ? <p>No hay registros disponibles en esta categoría.</p>
                : <div className="grid catalogo-grid">
                    {(esDestinos ? destinos : categoriaActual?.nombre === "Eventos" ? incluirCarrera([...proximosEventos(datosCategoria), ...datosCategoria.filter(item => !proximosEventos(datosCategoria).includes(item))]) : datosCategoria).map(item => (
                      <Tarjeta key={item.id} item={item} tipo={esDestinos ? "Destino" : categoriaActual.nombre} onSelect={seleccionarElemento} />
                    ))}
                  </div>
            )}
          </section>
        </main>
      )}

      {esBuscar && (
        <main className="pagina-busqueda">
          <section className="busqueda-hero">
            <div className="busqueda-fondo" aria-hidden="true" />
            <div className="busqueda-contenido">
              <span className="busqueda-etiqueta">✦ TU PRÓXIMA AVENTURA COMIENZA AQUÍ</span>
              <h1>Encuentra tu rincón <em>favorito de Sucre.</em></h1>
              <p>Descubre playas paradisíacas, hospedajes acogedores, sabores auténticos y experiencias inolvidables en el Golfo de Morrosquillo.</p>
              <form onSubmit={buscar} className="busqueda-formulario" role="search">
                <span className="busqueda-lupa" aria-hidden="true">⌕</span>
                <input aria-label="Buscar lugares turísticos" value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Busca playas, hoteles, restaurantes..." />
                <button type="submit">Buscar <span aria-hidden="true">↗</span></button>
              </form>
              <div className="busqueda-sugerencias"><span>Explora por tema:</span>
                {['Playas', 'Hoteles', 'Gastronomía', 'Experiencias'].map(tema => (
                  <button type="button" key={tema} onClick={() => ejecutarBusqueda(tema)}>{tema} ↗</button>
                ))}
              </div>
            </div>
          </section>
          <section className="busqueda-resultados section">
            {cargando && <p className="busqueda-estado">Buscando lugares para ti...</p>}
            {error && <p className="error">{error}</p>}
            {!cargando && resultados.length > 0 && (
              <>
                <div className="section-heading"><div><span className="tag">DESCUBRE SUCRE</span><h2>Resultados de búsqueda</h2><p>Estos lugares podrían ser tu próxima aventura.</p></div></div>
                <div className="grid">
                  {resultados.map((item, index) => (
                    <Tarjeta key={item.id || index} item={item} tipo={item.tipo_contenido || item.categoria || "Resultado"} onSelect={seleccionarElemento} />
                  ))}
                </div>
              </>
            )}
            {!cargando && busquedaRealizada && resultados.length === 0 && !error && <p className="busqueda-estado">No encontramos resultados todavía. Prueba con otra palabra.</p>}
            {!cargando && !busquedaRealizada && resultados.length === 0 && <div className="busqueda-invitacion"><span>✧</span><h2>Hay mucho por descubrir</h2><p>Escribe lo que te gustaría conocer y encuentra tu próximo destino.</p></div>}
          </section>
        </main>
      )}

      {elementoSeleccionado && (
        <div className="modal-fondo" onClick={() => setElementoSeleccionado(null)}>
          <div className="modal-detalle" role="dialog" aria-modal="true" aria-label={`Detalles de ${elementoSeleccionado.nombre}`} onClick={event => event.stopPropagation()}>
            <button className="cerrar-modal" aria-label="Cerrar detalles" onClick={() => setElementoSeleccionado(null)}>✕</button>
            <div className="modal-cover"><img src={elementoSeleccionado.imagen || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"} alt={elementoSeleccionado.nombre} /></div>
            <span className="tag">{tipoSeleccionado}</span>
            <h2>{elementoSeleccionado.nombre}</h2>
            <p><strong>Municipio:</strong> {elementoSeleccionado.municipio || "No especificado"}</p>
            <p><strong>Descripción:</strong> {elementoSeleccionado.descripcion || "Sin descripción"}</p>
            {elementoSeleccionado.tipo && <p><strong>Tipo:</strong> {elementoSeleccionado.tipo}</p>}
            {elementoSeleccionado.especialidad && <p><strong>Especialidad:</strong> {elementoSeleccionado.especialidad}</p>}
            {elementoSeleccionado.fecha && <p><strong>Fecha:</strong> {fechaLegible(elementoSeleccionado.fecha)}</p>}
            {elementoSeleccionado.fechaPorConfirmar && <p><strong>Próxima edición:</strong> Fecha por confirmar con la organización.</p>}
            {elementoSeleccionado.enlaceOficial && <p><a href={elementoSeleccionado.enlaceOficial} target="_blank" rel="noopener noreferrer" className="enlace-oficial-evento">Visitar página oficial e información de inscripciones ↗</a></p>}
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
