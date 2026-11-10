
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sucre_turistico",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function probarConexion() {
    try {
        const conexion = await db.getConnection();
        console.log("MySQL conectado correctamente");
        conexion.release();
    } catch (error) {
        console.error("Error conectando con MySQL:", error.message);
    }
}

// CONSULTAR TODOS LOS EVENTOS
app.get("/api/eventos", async (req, res) => {
    try {
        const [eventos] = await db.query(
            "SELECT * FROM eventos ORDER BY id"
        );
        res.json(eventos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los eventos" });
    }
});

// CONSULTAR UN EVENTO
app.get("/api/eventos/:id", async (req, res) => {
    try {
        const [resultados] = await db.query(
            "SELECT * FROM eventos WHERE id = ?",
            [req.params.id]
        );

        if (resultados.length === 0) {
            return res.status(404).json({ error: "Evento no encontrado" });
        }

        res.json(resultados[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el evento" });
    }
});

// CREAR EVENTO
app.post("/api/eventos", async (req, res) => {
    try {
        const { nombre, municipio, fecha, tipo, descripcion, imagen, estado } = req.body;

        if (!nombre || !municipio || !fecha || !tipo) {
            return res.status(400).json({
                error: "Campos obligatorios: nombre, municipio, fecha y tipo"
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO eventos
            (nombre, municipio, fecha, tipo, descripcion, imagen, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                municipio,
                fecha,
                tipo,
                descripcion || null,
                imagen || null,
                estado || "Publicado"
            ]
        );

        const [nuevo] = await db.query(
            "SELECT * FROM eventos WHERE id = ?",
            [resultado.insertId]
        );

        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el evento" });
    }
});

// ACTUALIZAR EVENTO
app.put("/api/eventos/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, municipio, fecha, tipo, descripcion, imagen, estado } = req.body;

        const [existente] = await db.query(
            "SELECT * FROM eventos WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Evento no encontrado" });
        }

        const actual = existente[0];

        await db.query(
            `UPDATE eventos SET
            nombre = ?, municipio = ?, fecha = ?, tipo = ?,
            descripcion = ?, imagen = ?, estado = ?
            WHERE id = ?`,
            [
                nombre ?? actual.nombre,
                municipio ?? actual.municipio,
                fecha ?? actual.fecha,
                tipo ?? actual.tipo,
                descripcion ?? actual.descripcion,
                imagen ?? actual.imagen,
                estado ?? actual.estado,
                id
            ]
        );

        const [actualizado] = await db.query(
            "SELECT * FROM eventos WHERE id = ?",
            [id]
        );

        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el evento" });
    }
});

// ELIMINAR EVENTO
app.delete("/api/eventos/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [existente] = await db.query(
            "SELECT * FROM eventos WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Evento no encontrado" });
        }

        await db.query(
            "DELETE FROM eventos WHERE id = ?",
            [id]
        );

        res.json({
            mensaje: "Eliminado correctamente",
            evento: existente[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el evento" });
    }
});

// ESTADO DEL SERVICIO
app.get("/", (req, res) => {
    res.json({
        servicio: "eventos-service",
        estado: "funcionando",
        puerto: PORT,
        baseDatos: "MySQL"
    });
});

app.listen(PORT, async () => {
    console.log(`eventos-service funcionando en http://localhost:${PORT}`);
    await probarConexion();
});

