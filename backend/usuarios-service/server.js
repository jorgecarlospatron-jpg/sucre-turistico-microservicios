
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3007;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sucre_turistico",
  waitForConnections: true,
  connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Falta configurar JWT_SECRET");
  process.exit(1);
}

// =====================================
// AUTENTICACIÓN Y PERMISOS
// =====================================

function autenticar(req, res, next) {
  const autorizacion = req.headers.authorization;

  if (!autorizacion?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    req.usuario = jwt.verify(autorizacion.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o vencido" });
  }
}

function soloAdministrador(req, res, next) {
  if (req.usuario.rol !== "administrador") {
    return res.status(403).json({
      error: "No tienes permisos para realizar esta acción"
    });
  }

  next();
}

// =====================================
// REGISTRO
// =====================================


app.post("/api/usuarios/registro", async (req, res) => {
  try {
    const { nombre, correo, password, telefono, rol } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        error: "Nombre, correo y contraseña son obligatorios"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener mínimo 8 caracteres"
      });
    }

    // Solo se permiten cuentas de turista o propietario.
    const rolSeleccionado = rol || "turista";

    if (!["turista", "propietario"].includes(rolSeleccionado)) {
      return res.status(400).json({
        error: "El tipo de cuenta seleccionado no es válido"
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const [existente] = await db.query(
      "SELECT id FROM usuarios WHERE correo = ?",
      [correoNormalizado]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        error: "El correo ya está registrado"
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [resultado] = await db.query(
      `INSERT INTO usuarios
      (nombre, correo, password, telefono, rol)
      VALUES (?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        correoNormalizado,
        hash,
        telefono || null,
        rolSeleccionado
      ]
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: {
        id: resultado.insertId,
        nombre: nombre.trim(),
        correo: correoNormalizado,
        rol: rolSeleccionado
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al registrar usuario"
    });
  }
});

// =====================================
// INICIAR SESIÓN
// =====================================

app.post("/api/usuarios/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        error: "Correo y contraseña son obligatorios"
      });
    }

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE correo = ?",
      [correo.trim().toLowerCase()]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: "Credenciales incorrectas"
      });
    }

    const usuario = usuarios[0];

    if (usuario.estado !== "activo") {
      return res.status(403).json({
        error: "La cuenta está inactiva"
      });
    }

    const valido = await bcrypt.compare(password, usuario.password);

    if (!valido) {
      return res.status(401).json({
        error: "Credenciales incorrectas"
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      mensaje: "Inicio de sesión correcto",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// =====================================
// PERFIL
// =====================================

app.get("/api/usuarios/perfil", autenticar, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      `SELECT id, nombre, correo, telefono, rol, estado
       FROM usuarios WHERE id = ?`,
      [req.usuario.id]
    );

    if (!usuarios.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuarios[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error consultando el perfil" });
  }
});
// =====================================
// NOTIFICACIONES DEL USUARIO
// =====================================

// CONSULTAR MIS NOTIFICACIONES
app.get(
  "/api/usuarios/notificaciones",
  autenticar,
  async (req, res) => {
    try {
      const [notificaciones] = await db.query(
        `SELECT n.*, a.nombre AS nombre_alojamiento
         FROM notificaciones n
         LEFT JOIN alojamientos a ON a.id = n.alojamiento_id
         WHERE n.usuario_id = ?
         ORDER BY n.fecha DESC`,
        [req.usuario.id]
      );

      res.json(notificaciones);

    } catch (error) {
      console.error("Error consultando notificaciones:", error);
      res.status(500).json({
        error: "No se pudieron consultar las notificaciones"
      });
    }
  }
);

// MARCAR NOTIFICACIÓN COMO LEÍDA
app.patch(
  "/api/usuarios/notificaciones/:id/leida",
  autenticar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [resultado] = await db.query(
        `UPDATE notificaciones
         SET leida = TRUE
         WHERE id = ? AND usuario_id = ?`,
        [id, req.usuario.id]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          error: "Notificación no encontrada"
        });
      }

      res.json({
        mensaje: "Notificación marcada como leída"
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "No se pudo actualizar la notificación"
      });
    }
  }
);

// =====================================
// ADMINISTRADOR: LISTAR USUARIOS
// =====================================

app.get(
  "/api/usuarios/admin/listar",
  autenticar,
  soloAdministrador,
  async (req, res) => {
    try {
      const [usuarios] = await db.query(
        `SELECT id, nombre, correo, telefono, rol, estado
         FROM usuarios
         ORDER BY id DESC`
      );

      res.json(usuarios);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error consultando los usuarios" });
    }
  }
);

// =====================================
// ADMINISTRADOR: CAMBIAR ROL
// =====================================

app.patch(
  "/api/usuarios/admin/:id/rol",
  autenticar,
  soloAdministrador,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { rol } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID de usuario inválido" });
      }

      if (!["turista", "propietario"].includes(rol)) {
        return res.status(400).json({
          error: "Solo se puede asignar el rol turista o propietario"
        });
      }

      const [resultado] = await db.query(
        `UPDATE usuarios
         SET rol = ?
         WHERE id = ? AND rol <> 'administrador'`,
        [rol, id]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          error: "Usuario no encontrado o no se puede modificar su rol"
        });
      }

      res.json({ mensaje: "Rol actualizado correctamente" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error actualizando el rol" });
    }
  }
);

// =====================================
// ADMINISTRADOR: ACTIVAR / DESACTIVAR
// =====================================

app.patch(
  "/api/usuarios/admin/:id/estado",
  autenticar,
  soloAdministrador,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID de usuario inválido" });
      }

      if (!["activo", "inactivo"].includes(estado)) {
        return res.status(400).json({
          error: "El estado debe ser activo o inactivo"
        });
      }

      if (id === Number(req.usuario.id)) {
        return res.status(400).json({
          error: "No puedes cambiar el estado de tu propia cuenta"
        });
      }

      const [resultado] = await db.query(
        `UPDATE usuarios
         SET estado = ?
         WHERE id = ? AND rol <> 'administrador'`,
        [estado, id]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          error: "Usuario no encontrado o no se puede modificar"
        });
      }

      res.json({
        mensaje: estado === "activo"
          ? "Cuenta activada correctamente"
          : "Cuenta desactivada correctamente"
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error actualizando el estado" });
    }
  }
);

// =====================================
// ESTADO DEL SERVICIO
// =====================================

app.get("/", (req, res) => {
  res.json({
    servicio: "usuarios-service",
    estado: "funcionando",
    puerto: PORT
  });
});

app.listen(PORT, async () => {
  try {
    await db.query("SELECT 1");
    console.log("MySQL conectado correctamente");
    console.log(`usuarios-service funcionando en puerto ${PORT}`);
  } catch (error) {
    console.error("Error conectando con MySQL:", error.message);
  }
});
