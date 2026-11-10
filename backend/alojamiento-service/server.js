import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
const app = express();
const PORT = 3002;

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

function autenticar(req, res, next) {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Debes iniciar sesión"
        });
    }

    const token = autorizacion.split(" ")[1];

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }
}
function autenticarOpcional(req, res, next) {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
        return next();
    }

    try {
        req.usuario = jwt.verify(
            autorizacion.split(" ")[1],
            process.env.JWT_SECRET
        );
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }

    next();
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

async function verificarPropiedad(alojamientoId, usuario) {
    const [filas] = await db.query(
        "SELECT id, propietario_id FROM alojamientos WHERE id = ?",
        [alojamientoId]
    );

    if (filas.length === 0) return false;

    if (usuario.rol === "administrador") return true;

    return (
        usuario.rol === "propietario" &&
        Number(filas[0].propietario_id) === Number(usuario.id)
    );
}

async function probarConexion() {
    try {
        const conexion = await db.getConnection();
        console.log("MySQL conectado correctamente");
        conexion.release();
    } catch (error) {
        console.error("Error conectando con MySQL:", error.message);
    }
}

// CONSULTAR ALOJAMIENTOS SEGÚN EL ROL
app.get("/api/alojamientos", autenticarOpcional, async (req, res) => {
    try {
        let consulta;
        let parametros = [];

        if (req.usuario?.rol === "administrador") {
            consulta = "SELECT * FROM alojamientos ORDER BY id";

        } else if (req.usuario?.rol === "propietario") {
            consulta = `
                SELECT * FROM alojamientos
                WHERE propietario_id = ?
                ORDER BY id
            `;
            parametros = [req.usuario.id];

        } else {
            consulta = `
                SELECT * FROM alojamientos
                WHERE LOWER(TRIM(estado)) = 'publicado'
                ORDER BY id
            `;
        }

        const [alojamientos] = await db.query(consulta, parametros);

        res.json(alojamientos);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener los alojamientos"
        });
    }
});

// CONSULTAR UN ALOJAMIENTO
app.get("/api/alojamientos/:id", autenticarOpcional, async (req, res) => {
    try {
        const [resultados] = await db.query(
            "SELECT * FROM alojamientos WHERE id = ?",
            [req.params.id]
        );

        if (resultados.length === 0) {
            return res.status(404).json({
                error: "Alojamiento no encontrado"
            });
        }

        const alojamiento = resultados[0];
        const usuario = req.usuario;

        const esAdministrador = usuario?.rol === "administrador";

        const esPropietario =
            usuario?.rol === "propietario" &&
            Number(alojamiento.propietario_id) === Number(usuario.id);

        const estaPublicado =
            String(alojamiento.estado || "").trim().toLowerCase() === "publicado";

        if (!estaPublicado && !esAdministrador && !esPropietario) {
            return res.status(404).json({
                error: "Alojamiento no disponible"
            });
        }

        res.json(alojamiento);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener el alojamiento"
        });
    }
});

// CREAR
app.post("/api/alojamientos", async (req, res) => {
    try {
        const { nombre, municipio, tipo, descripcion, imagen, estado } = req.body;

        if (!nombre || !municipio || !tipo) {
            return res.status(400).json({
                error: "Campos obligatorios: nombre, municipio y tipo"
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO alojamientos
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
            "SELECT * FROM alojamientos WHERE id = ?",
            [resultado.insertId]
        );

        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el alojamiento" });
    }
});

// CREAR ESTABLECIMIENTO DESDE EL PANEL DEL PROPIETARIO
app.post(
    "/api/alojamientos/propietario",
    autenticar,
    permitirRoles("propietario"),
    async (req, res) => {
        try {
            const {
                nombre,
                municipio,
                tipo,
                descripcion,
                imagen
            } = req.body;

            if (!nombre || !municipio || !tipo) {
                return res.status(400).json({
                    error: "El nombre, municipio y tipo son obligatorios"
                });
            }

            const [resultado] = await db.query(
                `INSERT INTO alojamientos
                (propietario_id, nombre, municipio, tipo,
                 descripcion, imagen, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.usuario.id,
                    nombre,
                    municipio,
                    tipo,
                    descripcion || null,
                    imagen || null,
                    "Borrador"
                ]
            );

            const [nuevo] = await db.query(
                "SELECT * FROM alojamientos WHERE id = ?",
                [resultado.insertId]
            );

            res.status(201).json({
                mensaje: "Establecimiento registrado correctamente. Está pendiente de publicación.",
                alojamiento: nuevo[0]
            });

        } catch (error) {
            console.error("Error creando establecimiento:", error);

            res.status(500).json({
                error: "No se pudo registrar el establecimiento"
            });
        }
    }
);

 // ACTUALIZAR ALOJAMIENTO Y NOTIFICAR AL PROPIETARIO
app.put(
    "/api/alojamientos/:id",
    autenticar,
    permitirRoles("administrador", "propietario"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const autorizado = await verificarPropiedad(id, req.usuario);

            if (!autorizado) {
                return res.status(403).json({
                    error: "No puedes modificar este establecimiento"
                });
            }

            const [existente] = await db.query(
                "SELECT * FROM alojamientos WHERE id = ?",
                [id]
            );

            if (existente.length === 0) {
                return res.status(404).json({
                    error: "Alojamiento no encontrado"
                });
            }

            const actual = existente[0];

            const {
                nombre,
                municipio,
                tipo,
                descripcion,
                imagen,
                estado
            } = req.body;

            // El propietario no puede cambiar el estado.
            const solicitaReenvio =
    req.usuario.rol === "propietario" &&
    String(actual.estado || "").trim().toLowerCase() === "rechazado" &&
    req.body.reenviar_revision === true;

const nuevoEstado = req.usuario.rol === "administrador"
    ? (estado ?? actual.estado)
    : solicitaReenvio
        ? "Borrador"
        : actual.estado;

            await db.query(
                `UPDATE alojamientos SET
                nombre = ?, municipio = ?, tipo = ?,
                descripcion = ?, imagen = ?, estado = ?
                WHERE id = ?`,
                [
                    nombre ?? actual.nombre,
                    municipio ?? actual.municipio,
                    tipo ?? actual.tipo,
                    descripcion ?? actual.descripcion,
                    imagen ?? actual.imagen,
                    nuevoEstado,
                    id
                ]
            );

            // Crear notificación únicamente si el administrador
            // cambió realmente el estado.
            if (req.usuario.rol === "administrador") {
                const estadoAnterior = String(actual.estado || "")
                    .trim().toLowerCase();

                const estadoNuevo = String(nuevoEstado || "")
                    .trim().toLowerCase();

                if (
                    estadoAnterior !== estadoNuevo &&
                    ["publicado", "rechazado"].includes(estadoNuevo) &&
                    actual.propietario_id
                ) {
                    const aprobado = estadoNuevo === "publicado";

                    const titulo = aprobado
                        ? "¡Tu alojamiento fue aprobado!"
                        : "Tu alojamiento fue rechazado";

                    const mensaje = aprobado
                        ? `Tu establecimiento "${actual.nombre}" ha sido aprobado y ya está publicado en Sucre Turístico.`
                        : `Tu establecimiento "${actual.nombre}" ha sido rechazado. Puedes ingresar a tu panel para revisar la información.`;

                    const tipoNotificacion = aprobado
                        ? "aprobacion"
                        : "rechazo";

                    await db.query(
                        `INSERT INTO notificaciones
                        (usuario_id, alojamiento_id, titulo, mensaje, tipo)
                        VALUES (?, ?, ?, ?, ?)`,
                        [
                            actual.propietario_id,
                            id,
                            titulo,
                            mensaje,
                            tipoNotificacion
                        ]
                    );
                }
            }

            const [actualizado] = await db.query(
                "SELECT * FROM alojamientos WHERE id = ?",
                [id]
            );

            res.json({
                mensaje: "Establecimiento actualizado correctamente",
                alojamiento: actualizado[0]
            });

        } catch (error) {
            console.error("Error al actualizar alojamiento:", error);

            res.status(500).json({
                error: "Error al actualizar el alojamiento"
            });
        }
    }
);



// ELIMINAR ALOJAMIENTO
app.delete(
    "/api/alojamientos/:id",
    autenticar,
    permitirRoles("administrador", "propietario"),
    async (req, res) => {
        const conexion = await db.getConnection();

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    error: "ID de establecimiento no válido"
                });
            }

            const autorizado = await verificarPropiedad(id, req.usuario);

            if (!autorizado) {
                return res.status(403).json({
                    error: "No puedes eliminar este establecimiento"
                });
            }

            await conexion.beginTransaction();

            const [existente] = await conexion.query(
                "SELECT id FROM alojamientos WHERE id = ? FOR UPDATE",
                [id]
            );

            if (existente.length === 0) {
                await conexion.rollback();

                return res.status(404).json({
                    error: "Alojamiento no encontrado"
                });
            }

            // Buscar reservas que pertenecen a las habitaciones
            // de este establecimiento.
            const [reservas] = await conexion.query(
                `SELECT r.id, r.estado
                 FROM reservas r
                 INNER JOIN habitaciones h
                    ON h.id = r.habitacion_id
                 WHERE h.alojamiento_id = ?
                 FOR UPDATE`,
                [id]
            );

            // Solo se permiten reservas canceladas.
            const reservasActivas = reservas.filter(reserva =>
                !["cancelada", "cancelado"].includes(
                    String(reserva.estado || "")
                        .trim()
                        .toLowerCase()
                )
            );

            if (reservasActivas.length > 0) {
                await conexion.rollback();

                return res.status(409).json({
                    error: "No se puede eliminar: el establecimiento tiene reservas pendientes o confirmadas."
                });
            }

            // Eliminar reservas canceladas.
            await conexion.query(
                `DELETE r
                 FROM reservas r
                 INNER JOIN habitaciones h
                    ON h.id = r.habitacion_id
                 WHERE h.alojamiento_id = ?
                 AND LOWER(TRIM(r.estado)) IN ('cancelada', 'cancelado')`,
                [id]
            );

            // Eliminar habitaciones.
            await conexion.query(
                "DELETE FROM habitaciones WHERE alojamiento_id = ?",
                [id]
            );

            // Eliminar establecimiento.
            await conexion.query(
                "DELETE FROM alojamientos WHERE id = ?",
                [id]
            );

            await conexion.commit();

            res.json({
                mensaje: "Establecimiento, habitaciones y reservas canceladas eliminados correctamente."
            });

        } catch (error) {
            await conexion.rollback();

            console.error("Error eliminando establecimiento:", error);

            res.status(500).json({
                error: "Error al eliminar el establecimiento"
            });

        } finally {
            conexion.release();
        }
    }
);



/* =========================================
   HABITACIONES
========================================= */

// CONSULTAR HABITACIONES DE UN ALOJAMIENTO
app.get(
    "/api/alojamientos/:id/habitaciones",
    autenticarOpcional,
    async (req, res) => {
        try {
            const [alojamientos] = await db.query(
                "SELECT * FROM alojamientos WHERE id = ?",
                [req.params.id]
            );

            if (alojamientos.length === 0) {
                return res.status(404).json({
                    error: "Alojamiento no encontrado"
                });
            }

            const alojamiento = alojamientos[0];
            const usuario = req.usuario;

            const esAdministrador = usuario?.rol === "administrador";

            const esPropietario =
                usuario?.rol === "propietario" &&
                Number(alojamiento.propietario_id) === Number(usuario.id);

            const estaPublicado =
                String(alojamiento.estado || "").trim().toLowerCase() === "publicado";

            if (!estaPublicado && !esAdministrador && !esPropietario) {
                return res.status(404).json({
                    error: "Las habitaciones de este alojamiento no están disponibles"
                });
            }

            const [habitaciones] = await db.query(
                `SELECT * FROM habitaciones
                 WHERE alojamiento_id = ?
                 ORDER BY id`,
                [req.params.id]
            );

            res.json(habitaciones);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Error al consultar las habitaciones"
            });
        }
    }
);

// CREAR HABITACIÓN
app.post(
    "/api/alojamientos/:id/habitaciones",
    autenticar,
    permitirRoles("administrador", "propietario"),
    async (req, res) => {
        try {
            const alojamientoId = Number(req.params.id);

            const {
                nombre,
                descripcion,
                capacidad,
                cantidad,
                precio_noche
            } = req.body;

            if (
                !nombre ||
                !Number.isInteger(Number(capacidad)) ||
                Number(capacidad) < 1 ||
                !Number.isInteger(Number(cantidad)) ||
                Number(cantidad) < 1 ||
                !Number.isFinite(Number(precio_noche)) ||
                Number(precio_noche) <= 0
            ) {
                return res.status(400).json({
                    error: "Verifica el nombre, capacidad, cantidad y precio"
                });
            }

            const autorizado = await verificarPropiedad(
                alojamientoId,
                req.usuario
            );

            if (!autorizado) {
                return res.status(403).json({
                    error: "No puedes administrar este alojamiento"
                });
            }

            const [resultado] = await db.query(
                `INSERT INTO habitaciones
                (alojamiento_id, nombre, descripcion, capacidad,
                 cantidad, precio_noche, estado)
                VALUES (?, ?, ?, ?, ?, ?, 'disponible')`,
                [
                    alojamientoId,
                    nombre,
                    descripcion || null,
                    Number(capacidad),
                    Number(cantidad),
                    Number(precio_noche)
                ]
            );

            const [nueva] = await db.query(
                "SELECT * FROM habitaciones WHERE id = ?",
                [resultado.insertId]
            );

            res.status(201).json(nueva[0]);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Error al crear la habitación"
            });
        }
    }
);

// CONSULTAR UNA HABITACIÓN
app.get("/api/habitaciones/:id", autenticarOpcional, async (req, res) => {
    try {
        const [filas] = await db.query(
            `SELECT h.*, a.estado AS estado_alojamiento,
                    a.propietario_id
             FROM habitaciones h
             INNER JOIN alojamientos a ON a.id = h.alojamiento_id
             WHERE h.id = ?`,
            [req.params.id]
        );

        if (filas.length === 0) {
            return res.status(404).json({
                error: "Habitación no encontrada"
            });
        }

        const habitacion = filas[0];
        const usuario = req.usuario;

        const esAdministrador = usuario?.rol === "administrador";

        const esPropietario =
            usuario?.rol === "propietario" &&
            Number(habitacion.propietario_id) === Number(usuario.id);

        const estaPublicado =
            String(habitacion.estado_alojamiento || "").trim().toLowerCase() === "publicado";

        if (!estaPublicado && !esAdministrador && !esPropietario) {
            return res.status(404).json({
                error: "Habitación no disponible"
            });
        }

        res.json(habitacion);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al consultar la habitación"
        });
    }
});

// ACTUALIZAR HABITACIÓN
app.put(
    "/api/habitaciones/:id",
    autenticar,
    permitirRoles("administrador", "propietario"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const [filas] = await db.query(
                "SELECT * FROM habitaciones WHERE id = ?",
                [id]
            );

            if (filas.length === 0) {
                return res.status(404).json({
                    error: "Habitación no encontrada"
                });
            }

            const actual = filas[0];

            const autorizado = await verificarPropiedad(
                actual.alojamiento_id,
                req.usuario
            );

            if (!autorizado) {
                return res.status(403).json({
                    error: "No puedes modificar esta habitación"
                });
            }

            const {
                nombre,
                descripcion,
                capacidad,
                cantidad,
                precio_noche,
                estado
            } = req.body;

            const nuevaCapacidad = Number(capacidad ?? actual.capacidad);
            const nuevaCantidad = Number(cantidad ?? actual.cantidad);
            const nuevoPrecio = Number(precio_noche ?? actual.precio_noche);
            const nuevoEstado = estado ?? actual.estado;

            if (
                !Number.isInteger(nuevaCapacidad) || nuevaCapacidad < 1 ||
                !Number.isInteger(nuevaCantidad) || nuevaCantidad < 1 ||
                !Number.isFinite(nuevoPrecio) || nuevoPrecio <= 0 ||
                !["disponible", "inactivo"].includes(nuevoEstado)
            ) {
                return res.status(400).json({
                    error: "Los datos de la habitación no son válidos"
                });
            }

            await db.query(
                `UPDATE habitaciones SET
                nombre = ?, descripcion = ?, capacidad = ?,
                cantidad = ?, precio_noche = ?, estado = ?
                WHERE id = ?`,
                [
                    nombre ?? actual.nombre,
                    descripcion ?? actual.descripcion,
                    nuevaCapacidad,
                    nuevaCantidad,
                    nuevoPrecio,
                    nuevoEstado,
                    id
                ]
            );

            const [actualizada] = await db.query(
                "SELECT * FROM habitaciones WHERE id = ?",
                [id]
            );

            res.json(actualizada[0]);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Error al actualizar la habitación"
            });
        }
    }
);

// ELIMINAR HABITACIÓN
app.delete(
    "/api/habitaciones/:id",
    autenticar,
    permitirRoles("administrador", "propietario"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            const [filas] = await db.query(
                "SELECT * FROM habitaciones WHERE id = ?",
                [id]
            );

            if (filas.length === 0) {
                return res.status(404).json({
                    error: "Habitación no encontrada"
                });
            }

            const habitacion = filas[0];

            const autorizado = await verificarPropiedad(
                habitacion.alojamiento_id,
                req.usuario
            );

            if (!autorizado) {
                return res.status(403).json({
                    error: "No puedes eliminar esta habitación"
                });
            }

            await db.query(
                "DELETE FROM habitaciones WHERE id = ?",
                [id]
            );

            res.json({
                mensaje: "Habitación eliminada correctamente"
            });

        } catch (error) {
            console.error(error);

            if (error.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    error: "No se puede eliminar: la habitación tiene reservas asociadas"
                });
            }

            res.status(500).json({
                error: "Error al eliminar la habitación"
            });
        }
    }
);

// ESTADO DEL SERVICIO
app.get("/", (req, res) => {
    res.json({
        servicio: "alojamiento-service",
        estado: "funcionando",
        puerto: PORT,
        baseDatos: "MySQL"
    });
});

app.listen(PORT, async () => {
    console.log(`alojamiento-service funcionando en http://localhost:${PORT}`);
    await probarConexion();
});