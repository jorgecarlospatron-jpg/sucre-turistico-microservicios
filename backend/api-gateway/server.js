import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const servicios = {
  destinos: process.env.DESTINOS_URL || "http://localhost:3001",
  alojamientos: process.env.ALOJAMIENTOS_URL || "http://localhost:3002",
  gastronomia: process.env.GASTRONOMIA_URL || "http://localhost:3003",
  experiencias: process.env.EXPERIENCIAS_URL || "http://localhost:3004",
  eventos: process.env.EVENTOS_URL || "http://localhost:3005",
  buscador: process.env.BUSCADOR_URL || "http://localhost:3006",
  usuarios: process.env.USUARIOS_URL || "http://localhost:3007",
  reservas: process.env.RESERVAS_URL || "http://localhost:3008"
};

// Función para enviar las solicitudes a los microservicios
async function proxyRequest(req, res, servicio, ruta) {
  try {
    const url = `${servicio}${ruta}`;

    const headers = {
      "Content-Type": "application/json"
    };

    // Reenviar el token JWT al microservicio
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const opciones = {
      method: req.method,
      headers
    };

    // Enviar los datos para POST, PUT y otros métodos con cuerpo
    if (req.method !== "GET" && req.method !== "HEAD") {
      opciones.body = JSON.stringify(req.body);
    }

    const respuesta = await fetch(url, opciones);
    const texto = await respuesta.text();

    res.status(respuesta.status);

    res.setHeader(
      "Content-Type",
      respuesta.headers.get("content-type") || "application/json"
    );

    res.send(texto);

  } catch (error) {
    console.error("Error conectando con el microservicio:", error.message);

    res.status(502).json({
      error: "No se pudo conectar con el microservicio",
      detalle: error.message
    });
  }
}


// ================================
// DESTINOS - PUERTO 3001
// ================================

app.all("/api/destinos", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.destinos,
    "/api/destinos"
  );
});

app.all("/api/destinos/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.destinos,
    `/api/destinos/${req.params.id}`
  );
});


// ================================
// ALOJAMIENTOS - PUERTO 3002
// ================================
app.all("/api/alojamientos/:id/habitaciones", (req, res) => {
    proxyRequest(
        req,
        res,
        servicios.alojamientos,
        `/api/alojamientos/${req.params.id}/habitaciones`
    );
});
// ACTUALIZAR Y ELIMINAR HABITACIONES
app.all("/api/habitaciones/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.alojamientos,
    `/api/habitaciones/${req.params.id}`
  );
});
app.all("/api/alojamientos", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.alojamientos,
    "/api/alojamientos"
  );
});
// REGISTRAR ESTABLECIMIENTO COMO PROPIETARIO
app.post("/api/alojamientos/propietario", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.alojamientos,
    "/api/alojamientos/propietario"
  );
});
app.all("/api/alojamientos/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.alojamientos,
    `/api/alojamientos/${req.params.id}`
  );
});


// ================================
// GASTRONOMÍA - PUERTO 3003
// ================================

app.all("/api/gastronomia", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.gastronomia,
    "/api/restaurantes"
  );
});

app.all("/api/gastronomia/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.gastronomia,
    `/api/restaurantes/${req.params.id}`
  );
});


// ================================
// EXPERIENCIAS - PUERTO 3004
// ================================

app.all("/api/experiencias", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.experiencias,
    "/api/experiencias"
  );
});

app.all("/api/experiencias/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.experiencias,
    `/api/experiencias/${req.params.id}`
  );
});


// ================================
// EVENTOS - PUERTO 3005
// ================================

app.all("/api/eventos", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.eventos,
    "/api/eventos"
  );
});

app.all("/api/eventos/:id", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.eventos,
    `/api/eventos/${req.params.id}`
  );
});

// ================================
// BUSCADOR - PUERTO 3006
// ================================

app.get("/api/buscar", (req, res) => {
  const parametros = new URLSearchParams(req.query).toString();

  proxyRequest(
    req,
    res,
    servicios.buscador,
    `/api/buscar?${parametros}`
  );
});

// USUARIOS - PUERTO 3007

app.all("/api/usuarios", (req, res) => {
  proxyRequest(req, res, servicios.usuarios, "/api/usuarios");
});

// RUTAS ADMINISTRATIVAS - USUARIOS

app.get("/api/usuarios/admin/listar", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    "/api/usuarios/admin/listar"
  );
});

app.patch("/api/usuarios/admin/:id/rol", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    `/api/usuarios/admin/${req.params.id}/rol`
  );
});

app.patch("/api/usuarios/admin/:id/estado", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    `/api/usuarios/admin/${req.params.id}/estado`
  );
});
// =====================================
// NOTIFICACIONES DEL USUARIO
// =====================================

app.get("/api/usuarios/notificaciones", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    "/api/usuarios/notificaciones"
  );
});

app.patch("/api/usuarios/notificaciones/:id/leida", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    `/api/usuarios/notificaciones/${req.params.id}/leida`
  );
});
app.all("/api/usuarios/:ruta", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.usuarios,
    `/api/usuarios/${req.params.ruta}`
  );
});


// =====================================
// RESERVAS - PUERTO 3008
// =====================================
app.get("/api/reservas/disponibilidad/:habitacion_id", (req, res) => {
  const parametros = new URLSearchParams(req.query).toString();

  proxyRequest(
    req,
    res,
    servicios.reservas,
    `/api/reservas/disponibilidad/${req.params.habitacion_id}?${parametros}`
  );
});

app.all("/api/reservas", (req, res) => {
  proxyRequest(req, res, servicios.reservas, "/api/reservas");
});

app.all("/api/reservas/mis-reservas", (req, res) => {
  proxyRequest(req, res, servicios.reservas, "/api/reservas/mis-reservas");
});

app.all("/api/reservas/propietario", (req, res) => {
  proxyRequest(req, res, servicios.reservas, "/api/reservas/propietario");
});

app.all("/api/reservas/:id/estado", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.reservas,
    `/api/reservas/${req.params.id}/estado`
  );
});

app.all("/api/reservas/:id/cancelar", (req, res) => {
  proxyRequest(
    req,
    res,
    servicios.reservas,
    `/api/reservas/${req.params.id}/cancelar`
  );
});


// ================================
// ESTADO DEL API GATEWAY
// ================================

app.get("/", (req, res) => {
  res.json({
    servicio: "api-gateway",
    estado: "funcionando",
    puerto: PORT,
    servicios: {
      destinos: "http://localhost:3001",
      alojamientos: "http://localhost:3002",
      gastronomia: "http://localhost:3003",
      experiencias: "http://localhost:3004",
      eventos: "http://localhost:3005",
      buscador: "http://localhost:3006"
    }
  });
});


// ================================
// INICIAR SERVIDOR
// ================================

app.listen(PORT, () => {
  console.log(`API Gateway funcionando en http://localhost:${PORT}`);
});
