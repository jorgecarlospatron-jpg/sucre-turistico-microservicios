
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
const PORT = 3004;

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

// CONSULTAR TODAS
app.get("/api/experiencias", async (req, res) => {
    try {
        const [experiencias] = await db.query(
            "SELECT * FROM experiencias ORDER BY id"
        );
        res.json(experiencias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las experiencias" });
    }
});

// CONSULTAR UNA
app.get("/api/experiencias/:id", async (req, res) => {
    try {
        const [resultados] = await db.query(
            "SELECT * FROM experiencias WHERE id = ?",
            [req.params.id]
        );

        if (resultados.length === 0) {
            return res.status(404).json({ error: "Experiencia no encontrada" });
        }

        res.json(resultados[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la experiencia" });
    }
});

// CREAR
app.post("/api/experiencias", async (req, res) => {
    try {
        const { nombre, municipio, tipo, descripcion, imagen, estado } = req.body;

        if (!nombre || !municipio || !tipo) {
            return res.status(400).json({
                error: "Campos obligatorios: nombre, municipio y tipo"
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO experiencias
            (nombre, municipio, tipo, descripcion, imagen, estado)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                municipio,
                tipo,
                descripcion || null,
                imagen || null,
                estado || "Publicado"
            ]
        );

        const [nuevo] = await db.query(
            "SELECT * FROM experiencias WHERE id = ?",
            [resultado.insertId]
        );

        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la experiencia" });
    }
});

// ACTUALIZAR
app.put("/api/experiencias/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, municipio, tipo, descripcion, imagen, estado } = req.body;

        const [existente] = await db.query(
            "SELECT * FROM experiencias WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Experiencia no encontrada" });
        }

        const actual = existente[0];

        await db.query(
            `UPDATE experiencias SET
            nombre = ?, municipio = ?, tipo = ?,
            descripcion = ?, imagen = ?, estado = ?
            WHERE id = ?`,
            [
                nombre ?? actual.nombre,
                municipio ?? actual.municipio,
                tipo ?? actual.tipo,
                descripcion ?? actual.descripcion,
                imagen ?? actual.imagen,
                estado ?? actual.estado,
                id
            ]
        );

        const [actualizado] = await db.query(
            "SELECT * FROM experiencias WHERE id = ?",
            [id]
        );

        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar la experiencia" });
    }
});

// ELIMINAR
app.delete("/api/experiencias/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [existente] = await db.query(
            "SELECT * FROM experiencias WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Experiencia no encontrada" });
        }

        await db.query(
            "DELETE FROM experiencias WHERE id = ?",
            [id]
        );

        res.json({
            mensaje: "Eliminado correctamente",
            experiencia: existente[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la experiencia" });
    }
});

// ESTADO DEL SERVICIO
app.get("/", (req, res) => {
    res.json({
        servicio: "experiencias-service",
        estado: "funcionando",
        puerto: PORT,
        baseDatos: "MySQL"
    });
});

app.listen(PORT, async () => {
    console.log(`experiencias-service funcionando en http://localhost:${PORT}`);
    await probarConexion();
});
