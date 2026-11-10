import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ===============================
// CONEXIÓN A MYSQL
// ===============================

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sucre_turistico",
  ssl: {},
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ===============================
// PROBAR CONEXIÓN
// ===============================

async function probarConexion() {
  try {
    const conexion = await db.getConnection();
    console.log("MySQL conectado correctamente");
    conexion.release();
  } catch (error) {
    console.error("Error conectando con MySQL:", error.message);
  }
}

// ===============================
// GET - TODOS LOS DESTINOS
// ===============================

app.get("/api/destinos", async (req, res) => {
  try {
    const [destinos] = await db.query(
      "SELECT * FROM destinos ORDER BY id"
    );

    res.json(destinos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener los destinos"
    });
  }
});

// ===============================
// GET - DESTINO POR ID
// ===============================

app.get("/api/destinos/:id", async (req, res) => {
  try {
    const [resultados] = await db.query(
      "SELECT * FROM destinos WHERE id = ?",
      [req.params.id]
    );

    if (resultados.length === 0) {
      return res.status(404).json({
        error: "Destino no encontrado"
      });
    }

    res.json(resultados[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener el destino"
    });
  }
});

// ===============================
// POST - CREAR DESTINO
// ===============================

app.post("/api/destinos", async (req, res) => {
  try {
    const {
      nombre,
      municipio,
      descripcion,
      tipo,
      estado,
      imagen,
      coordenadas
    } = req.body;

    if (!nombre || !municipio || !tipo) {
      return res.status(400).json({
        error: "Campos obligatorios: nombre, municipio, tipo"
      });
    }

    const [resultado] = await db.query(
      `INSERT INTO destinos
      (nombre, municipio, descripcion, tipo, estado, imagen, coordenadas)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        municipio,
        descripcion || null,
        tipo,
        estado || "Publicado",
        imagen || null,
        coordenadas || null
      ]
    );

    const [nuevoDestino] = await db.query(
      "SELECT * FROM destinos WHERE id = ?",
      [resultado.insertId]
    );

    res.status(201).json(nuevoDestino[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al crear el destino"
    });
  }
});

// ===============================
// PUT - ACTUALIZAR DESTINO
// ===============================

app.put("/api/destinos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      nombre,
      municipio,
      descripcion,
      tipo,
      estado,
      imagen,
      coordenadas
    } = req.body;

    const [existente] = await db.query(
      "SELECT * FROM destinos WHERE id = ?",
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({
        error: "Destino no encontrado"
      });
    }

    await db.query(
      `UPDATE destinos
       SET nombre = ?,
           municipio = ?,
           descripcion = ?,
           tipo = ?,
           estado = ?,
           imagen = ?,
           coordenadas = ?
       WHERE id = ?`,
      [
        nombre ?? existente[0].nombre,
        municipio ?? existente[0].municipio,
        descripcion ?? existente[0].descripcion,
        tipo ?? existente[0].tipo,
        estado ?? existente[0].estado,
        imagen ?? existente[0].imagen,
        coordenadas ?? existente[0].coordenadas,
        id
      ]
    );

    const [actualizado] = await db.query(
      "SELECT * FROM destinos WHERE id = ?",
      [id]
    );

    res.json(actualizado[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al actualizar el destino"
    });
  }
});

// ===============================
// DELETE - ELIMINAR DESTINO
// ===============================

app.delete("/api/destinos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [existente] = await db.query(
      "SELECT * FROM destinos WHERE id = ?",
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({
        error: "Destino no encontrado"
      });
    }

    await db.query(
      "DELETE FROM destinos WHERE id = ?",
      [id]
    );

    res.json({
      mensaje: "Eliminado correctamente",
      destino: existente[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al eliminar el destino"
    });
  }
});

// ===============================
// RUTA PRINCIPAL
// ===============================

app.get("/", (req, res) => {
  res.json({
    servicio: "destinos-service",
    estado: "funcionando",
    puerto: PORT,
    baseDatos: "MySQL"
  });
});

// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, async () => {
  console.log(`destinos-service funcionando en http://localhost:${PORT}`);
  await probarConexion();
});