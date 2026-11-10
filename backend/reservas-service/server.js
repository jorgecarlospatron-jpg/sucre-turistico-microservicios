
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3008;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sucre_turistico",
  ssl: { minVersion: "TLSv1.2" },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =====================================
// AUTENTICACIÓN Y PERMISOS
// =====================================

function autenticar(req, res, next) {
  const autorizacion = req.headers.authorization;

  if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Debes iniciar sesión"
    });
  }

  try {
    const token = autorizacion.split(" ")[1];
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido o expirado"
    });
  }
}

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción"
      });
    }

    next();
  };
}

// =====================================
// CONEXIÓN A MYSQL
// =====================================

async function probarConexion() {
  try {
    const conexion = await db.getConnection();
    console.log("MySQL conectado correctamente");
    conexion.release();
  } catch (error) {
    console.error("Error conectando con MySQL:", error.message);
  }
}

// =====================================
// CONSULTAR DISPONIBILIDAD POR FECHAS
// =====================================

app.get(
  "/api/reservas/disponibilidad/:habitacion_id",
  async (req, res) => {
    try {
      const habitacionId = Number(req.params.habitacion_id);
      const { fecha_entrada, fecha_salida } = req.query;

      if (
        !Number.isInteger(habitacionId) ||
        habitacionId < 1 ||
        !fecha_entrada ||
        !fecha_salida
      ) {
        return res.status(400).json({
          error: "Debes indicar habitación y fechas"
        });
      }

      const entrada = new Date(`${fecha_entrada}T00:00:00`);
      const salida = new Date(`${fecha_salida}T00:00:00`);

      if (
        Number.isNaN(entrada.getTime()) ||
        Number.isNaN(salida.getTime()) ||
        entrada.toISOString().slice(0, 10) !== fecha_entrada ||
        salida.toISOString().slice(0, 10) !== fecha_salida ||
        salida <= entrada
      ) {
        return res.status(400).json({
          error: "Las fechas seleccionadas no son válidas"
        });
      }

      const [habitaciones] = await db.query(
        `SELECT id, nombre, cantidad, capacidad,
                precio_noche, estado
         FROM habitaciones
         WHERE id = ?`,
        [habitacionId]
      );

      if (habitaciones.length === 0) {
        return res.status(404).json({
          error: "Habitación no encontrada"
        });
      }

      const habitacion = habitaciones[0];

      const [ocupacion] = await db.query(
        `SELECT COUNT(*) AS ocupadas
         FROM reservas
         WHERE habitacion_id = ?
         AND estado IN ('pendiente', 'aceptada')
         AND fecha_entrada < ?
         AND fecha_salida > ?`,
        [habitacionId, fecha_salida, fecha_entrada]
      );

      const total = Number(habitacion.cantidad);
      const ocupadas = Number(ocupacion[0].ocupadas);

      const disponibles =
        habitacion.estado === "disponible"
          ? Math.max(0, total - ocupadas)
          : 0;

      res.json({
        habitacion_id: habitacion.id,
        nombre: habitacion.nombre,
        fecha_entrada,
        fecha_salida,
        cantidad_total: total,
        habitaciones_ocupadas: ocupadas,
        habitaciones_disponibles: disponibles,
        precio_noche: Number(habitacion.precio_noche),
        disponible: disponibles > 0
      });

    } catch (error) {
      console.error("Error consultando disponibilidad:", error);

      res.status(500).json({
        error: "Error al consultar la disponibilidad"
      });
    }
  }
);

// =====================================
// CREAR RESERVA
// =====================================

app.post(
  "/api/reservas",
  autenticar,
  permitirRoles("turista"),
  async (req, res) => {
    let conexion;

    try {
      const {
        habitacion_id,
        fecha_entrada,
        fecha_salida,
        cantidad_huespedes,
        observaciones
      } = req.body;

      const habitacionId = Number(habitacion_id);
      const huespedes = Number(cantidad_huespedes);

      if (
        !Number.isInteger(habitacionId) ||
        habitacionId < 1 ||
        !Number.isInteger(huespedes) ||
        huespedes < 1 ||
        !fecha_entrada ||
        !fecha_salida
      ) {
        return res.status(400).json({
          error: "Completa todos los datos de la reserva"
        });
      }

      const entrada = new Date(`${fecha_entrada}T00:00:00`);
      const salida = new Date(`${fecha_salida}T00:00:00`);

      if (
        Number.isNaN(entrada.getTime()) ||
        Number.isNaN(salida.getTime()) ||
        entrada.toISOString().slice(0, 10) !== fecha_entrada ||
        salida.toISOString().slice(0, 10) !== fecha_salida ||
        salida <= entrada
      ) {
        return res.status(400).json({
          error: "Las fechas de entrada y salida no son válidas"
        });
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (entrada < hoy) {
        return res.status(400).json({
          error: "La fecha de entrada no puede estar en el pasado"
        });
      }

      const noches = Math.round(
        (salida.getTime() - entrada.getTime()) / 86400000
      );

      conexion = await db.getConnection();
      await conexion.beginTransaction();

      // Bloquear la habitación mientras se comprueba disponibilidad
      const [habitaciones] = await conexion.query(
        `SELECT * FROM habitaciones
         WHERE id = ?
         FOR UPDATE`,
        [habitacionId]
      );

      if (habitaciones.length === 0) {
        await conexion.rollback();
        return res.status(404).json({
          error: "La habitación no existe"
        });
      }

      const habitacion = habitaciones[0];

      if (habitacion.estado !== "disponible") {
        await conexion.rollback();
        return res.status(400).json({
          error: "Esta habitación no está disponible"
        });
      }

      if (huespedes > Number(habitacion.capacidad)) {
        await conexion.rollback();
        return res.status(400).json({
          error: `La capacidad máxima es de ${habitacion.capacidad} huéspedes`
        });
      }

      // Contar reservas que se cruzan con las fechas solicitadas
      const [ocupacion] = await conexion.query(
        `SELECT COUNT(*) AS total
         FROM reservas
         WHERE habitacion_id = ?
         AND estado IN ('pendiente', 'aceptada')
         AND fecha_entrada < ?
         AND fecha_salida > ?`,
        [habitacionId, fecha_salida, fecha_entrada]
      );

      if (Number(ocupacion[0].total) >= Number(habitacion.cantidad)) {
        await conexion.rollback();
        return res.status(409).json({
          error: "No hay disponibilidad para esas fechas"
        });
      }

      const precioTotal = noches * Number(habitacion.precio_noche);

      const [resultado] = await conexion.query(
        `INSERT INTO reservas
        (usuario_id, habitacion_id, fecha_entrada, fecha_salida,
         cantidad_huespedes, precio_total, estado, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
        [
          req.usuario.id,
          habitacionId,
          fecha_entrada,
          fecha_salida,
          huespedes,
          precioTotal,
          observaciones || null
        ]
      );

      const [nuevaReserva] = await conexion.query(
        `SELECT r.*, h.nombre AS habitacion_nombre,
                a.nombre AS alojamiento_nombre
         FROM reservas r
         INNER JOIN habitaciones h ON r.habitacion_id = h.id
         INNER JOIN alojamientos a ON h.alojamiento_id = a.id
         WHERE r.id = ?`,
        [resultado.insertId]
      );

      await conexion.commit();

      res.status(201).json({
        mensaje: "Solicitud de reserva creada correctamente",
        reserva: nuevaReserva[0],
        noches,
        precio_por_noche: Number(habitacion.precio_noche)
      });

    } catch (error) {
      if (conexion) await conexion.rollback();

      console.error("Error creando reserva:", error);

      res.status(500).json({
        error: "Error al crear la reserva"
      });

    } finally {
      if (conexion) conexion.release();
    }
  }
);

// =====================================
// CONSULTAR RESERVAS DEL TURISTA
// =====================================

app.get(
  "/api/reservas/mis-reservas",
  autenticar,
  permitirRoles("turista"),
  async (req, res) => {
    try {
      const [reservas] = await db.query(
        `SELECT r.*,
                h.nombre AS habitacion_nombre,
                h.capacidad,
                a.nombre AS alojamiento_nombre,
                a.municipio,
                a.imagen
         FROM reservas r
         INNER JOIN habitaciones h ON r.habitacion_id = h.id
         INNER JOIN alojamientos a ON h.alojamiento_id = a.id
         WHERE r.usuario_id = ?
         ORDER BY r.fecha_reserva DESC`,
        [req.usuario.id]
      );

      res.json(reservas);

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Error al consultar tus reservas"
      });
    }
  }
);

// =====================================
// CONSULTAR RESERVAS DEL PROPIETARIO
// =====================================

app.get(
  "/api/reservas/propietario",
  autenticar,
  permitirRoles("propietario", "administrador"),
  async (req, res) => {
    try {
      let consulta = `
        SELECT r.*,
               h.nombre AS habitacion_nombre,
               a.nombre AS alojamiento_nombre,
               a.municipio,
               u.nombre AS turista_nombre,
               u.correo AS turista_correo,
               u.telefono AS turista_telefono
        FROM reservas r
        INNER JOIN habitaciones h ON r.habitacion_id = h.id
        INNER JOIN alojamientos a ON h.alojamiento_id = a.id
        INNER JOIN usuarios u ON r.usuario_id = u.id
      `;

      const parametros = [];

      if (req.usuario.rol === "propietario") {
        consulta += " WHERE a.propietario_id = ?";
        parametros.push(req.usuario.id);
      }

      consulta += " ORDER BY r.fecha_reserva DESC";

      const [reservas] = await db.query(consulta, parametros);

      res.json(reservas);

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Error al consultar las solicitudes"
      });
    }
  }
);

// =====================================
// ACEPTAR O RECHAZAR RESERVA
// =====================================

app.patch(
  "/api/reservas/:id/estado",
  autenticar,
  permitirRoles("propietario", "administrador"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body;

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          error: "Identificador de reserva inválido"
        });
      }

      if (!["aceptada", "rechazada"].includes(estado)) {
        return res.status(400).json({
          error: "El estado debe ser aceptada o rechazada"
        });
      }

      const [reservas] = await db.query(
        `SELECT r.*, a.propietario_id
         FROM reservas r
         INNER JOIN habitaciones h ON r.habitacion_id = h.id
         INNER JOIN alojamientos a ON h.alojamiento_id = a.id
         WHERE r.id = ?`,
        [id]
      );

      if (reservas.length === 0) {
        return res.status(404).json({
          error: "Reserva no encontrada"
        });
      }

      const reserva = reservas[0];

      if (
        req.usuario.rol === "propietario" &&
        Number(reserva.propietario_id) !== Number(req.usuario.id)
      ) {
        return res.status(403).json({
          error: "Esta reserva no pertenece a tus alojamientos"
        });
      }

      if (reserva.estado !== "pendiente") {
        return res.status(400).json({
          error: "Solo puedes gestionar reservas pendientes"
        });
      }

      if (estado === "aceptada") {
        const [ocupacion] = await db.query(
          `SELECT COUNT(*) AS total
           FROM reservas
           WHERE habitacion_id = ?
           AND id <> ?
           AND estado = 'aceptada'
           AND fecha_entrada < ?
           AND fecha_salida > ?`,
          [
            reserva.habitacion_id,
            id,
            reserva.fecha_salida,
            reserva.fecha_entrada
          ]
        );

        const [habitaciones] = await db.query(
          "SELECT cantidad FROM habitaciones WHERE id = ?",
          [reserva.habitacion_id]
        );

        if (
          habitaciones.length === 0 ||
          Number(ocupacion[0].total) >= Number(habitaciones[0].cantidad)
        ) {
          return res.status(409).json({
            error: "No hay disponibilidad para aceptar esta reserva"
          });
        }
      }

      await db.query(
        "UPDATE reservas SET estado = ? WHERE id = ?",
        [estado, id]
      );

      res.json({
        mensaje: estado === "aceptada"
          ? "Reserva aceptada correctamente"
          : "Reserva rechazada correctamente",
        id,
        estado
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Error al actualizar la reserva"
      });
    }
  }
);

// =====================================
// CANCELAR RESERVA DEL TURISTA
// =====================================

app.patch(
  "/api/reservas/:id/cancelar",
  autenticar,
  permitirRoles("turista"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [reservas] = await db.query(
        "SELECT * FROM reservas WHERE id = ? AND usuario_id = ?",
        [id, req.usuario.id]
      );

      if (reservas.length === 0) {
        return res.status(404).json({
          error: "Reserva no encontrada"
        });
      }

      if (!["pendiente", "aceptada"].includes(reservas[0].estado)) {
        return res.status(400).json({
          error: "Esta reserva no se puede cancelar"
        });
      }

      await db.query(
        "UPDATE reservas SET estado = 'cancelada' WHERE id = ?",
        [id]
      );

      res.json({
        mensaje: "Reserva cancelada correctamente"
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Error al cancelar la reserva"
      });
    }
  }
);

// =====================================
// ESTADO DEL SERVICIO
// =====================================

app.get("/", (req, res) => {
  res.json({
    servicio: "reservas-service",
    estado: "funcionando",
    puerto: PORT,
    baseDatos: "MySQL"
  });
});

app.listen(PORT, async () => {
  console.log(`reservas-service funcionando en http://localhost:${PORT}`);
  await probarConexion();
});
