
import { createContext, useContext, useState } from "react";
import {
  iniciarSesion as loginService,
  cerrarSesion as logoutService,
  obtenerUsuario
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(obtenerUsuario);

  async function login(correo, password) {
    const resultado = await loginService(correo, password);
    setUsuario(resultado.usuario);
    return resultado;
  }

  function logout() {
    logoutService();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
