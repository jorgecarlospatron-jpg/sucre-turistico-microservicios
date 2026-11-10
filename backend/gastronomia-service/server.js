
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
const PORT = 3003;

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

// CONSULTAR TODOS LOS RESTAURANTES
app.get("/api/restaurantes", async (req, res) => {
    try {
        const [restaurantes] = await db.query(
            "SELECT * FROM restaurantes ORDER BY id"
        );
        res.json(restaurantes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los restaurantes" });
    }
});

// CONSULTAR UN RESTAURANTE
app.get("/api/restaurantes/:id", async (req, res) => {
    try {
        const [resultados] = await db.query(
            "SELECT * FROM restaurantes WHERE id = ?",
            [req.params.id]
        );

        if (resultados.length === 0) {
            return res.status(404).json({ error: "Restaurante no encontrado" });
        }

        res.json(resultados[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el restaurante" });
    }
});

// CREAR RESTAURANTE
app.post("/api/restaurantes", async (req, res) => {
    try {
        const { nombre, municipio, especialidad, descripcion, imagen, estado } = req.body;

        if (!nombre || !municipio || !especialidad) {
            return res.status(400).json({
                error: "Campos obligatorios: nombre, municipio y especialidad"
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO restaurantes
            (nombre, municipio, especialidad, descripcion, imagen, estado)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                municipio,
                especialidad,
                descripcion || null,
                imagen || null,
                estado || "Publicado"
            ]
        );

        const [nuevo] = await db.query(
            "SELECT * FROM restaurantes WHERE id = ?",
            [resultado.insertId]
        );

        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el restaurante" });
    }
});

// ACTUALIZAR RESTAURANTE
app.put("/api/restaurantes/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nombre, municipio, especialidad, descripcion, imagen, estado } = req.body;

        const [existente] = await db.query(
            "SELECT * FROM restaurantes WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Restaurante no encontrado" });
        }

        const actual = existente[0];

        await db.query(
            `UPDATE restaurantes SET
            nombre = ?, municipio = ?, especialidad = ?,
            descripcion = ?, imagen = ?, estado = ?
            WHERE id = ?`,
            [
                nombre ?? actual.nombre,
                municipio ?? actual.municipio,
                especialidad ?? actual.especialidad,
                descripcion ?? actual.descripcion,
                imagen ?? actual.imagen,
                estado ?? actual.estado,
                id
            ]
        );

        const [actualizado] = await db.query(
            "SELECT * FROM restaurantes WHERE id = ?",
            [id]
        );

        res.json(actualizado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el restaurante" });
    }
});

// ELIMINAR RESTAURANTE
app.delete("/api/restaurantes/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [existente] = await db.query(
            "SELECT * FROM restaurantes WHERE id = ?",
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({ error: "Restaurante no encontrado" });
        }

        await db.query(
            "DELETE FROM restaurantes WHERE id = ?",
            [id]
        );

        res.json({
            mensaje: "Eliminado correctamente",
            restaurante: existente[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el restaurante" });
    }
});

// ESTADO DEL SERVICIO
app.get("/", (req, res) => {
    res.json({
        servicio: "gastronomia-service",
        estado: "funcionando",
        puerto: PORT,
        baseDatos: "MySQL"
    });
});

app.listen(PORT, async () => {
    console.log(`gastronomia-service funcionando en http://localhost:${PORT}`);
    await probarConexion();
});
