import React from 'react';
import { useEffect, useState } from "react";


const services = {
  destinos: "http://localhost:3001/api/destinos",
  alojamientos: "http://localhost:3002/api/alojamientos",
  gastronomia: "http://localhost:3003/api/gastronomia"
};

function App() {
  const [tipo, setTipo] = useState("destinos");
  const [datos, setDatos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({});

  async function cargar() {
    try {
      const res = await fetch(services[tipo]);
      const json = await res.json();
      setDatos(json);
      setMensaje("Servicio conectado correctamente.");
    } catch {
      setDatos([]);
      setMensaje("No se pudo conectar. Verifica que el microservicio esté ejecutándose.");
    }
  }

  useEffect(() => { cargar(); }, [tipo]);

  function campos() {
    if (tipo === "destinos") return ["nombre", "municipio", "descripcion"];
    if (tipo === "alojamientos") return ["nombre", "municipio", "tipo"];
    return ["nombre", "municipio", "especialidad"];
  }

  async function crear(e) {
    e.preventDefault();
    try {
      const res = await fetch(services[tipo], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setForm({});
      setMensaje("Registro creado correctamente.");
      cargar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function eliminar(id) {
    await fetch(`${services[tipo]}/${id}`, { method: "DELETE" });
    setMensaje("Registro eliminado.");
    cargar();
  }

  return (
    <main>
      <h1>SUCRE TURÍSTICO</h1>
      <p>Frontend básico para probar los microservicios</p>

      <div className="tabs">
        <button onClick={() => setTipo("destinos")}>Destinos</button>
        <button onClick={() => setTipo("alojamientos")}>Alojamientos</button>
        <button onClick={() => setTipo("gastronomia")}>Gastronomía</button>
      </div>

      <p className="mensaje">{mensaje}</p>

      <section className="panel">
        <h2>Registrar {tipo}</h2>
        <form onSubmit={crear}>
          {campos().map(campo => (
            <input
              key={campo}
              placeholder={campo}
              value={form[campo] || ""}
              onChange={e => setForm({ ...form, [campo]: e.target.value })}
            />
          ))}
          <button type="submit">Registrar</button>
        </form>
      </section>

      <section>
        <h2>Registros</h2>
        <div className="cards">
          {datos.map(item => (
            <article className="card" key={item.id}>
              <h3>{item.nombre}</h3>
              <p><b>Municipio:</b> {item.municipio}</p>
              <p>{item.descripcion || item.tipo || item.especialidad}</p>
              <button onClick={() => eliminar(item.id)}>Eliminar</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
