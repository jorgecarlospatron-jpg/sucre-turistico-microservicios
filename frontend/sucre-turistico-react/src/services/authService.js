
const API = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/usuarios`;

export async function registrarUsuario(datos) {
  const response = await fetch(`${API}/registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datos)
  });

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(resultado.mensaje || resultado.error || "No se pudo registrar el usuario");
  }

  return resultado;
}

export async function iniciarSesion(correo, password) {
  const response = await fetch(`${API}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ correo, password })
  });

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(resultado.mensaje || resultado.error || "Credenciales incorrectas");
  }

  if (resultado.token) {
    localStorage.setItem("token", resultado.token);
  }

  if (resultado.usuario) {
    localStorage.setItem("usuario", JSON.stringify(resultado.usuario));
  }

  return resultado;
}

export function cerrarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export function obtenerUsuario() {
  const usuario = localStorage.getItem("usuario");

  return usuario ? JSON.parse(usuario) : null;
}

export function obtenerToken() {
  return localStorage.getItem("token");
}
