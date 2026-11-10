# gastronomia-service

Microservicio encargado de gestionar la información gastronómica de la plataforma **SUCRE TURÍSTICO**.

## Tecnologías
- Node.js
- Express
- CORS
- JavaScript
- API REST

## Puerto
`http://localhost:3003`

## Instalación
```bash
cd backend\gastronomia-service
npm install
```

## Ejecución
```bash
node server.js
```

## Endpoint principal
```text
GET http://localhost:3003/api/gastronomia
```

## Operaciones CRUD

### Consultar restaurantes
```http
GET /api/gastronomia
```

### Consultar un restaurante
```http
GET /api/gastronomia/:id
```

### Registrar restaurante
```http
POST /api/gastronomia
```

Ejemplo:
```json
{
  "nombre": "Sabor del Golfo",
  "municipio": "Tolú",
  "especialidad": "Comida de mar"
}
```

### Actualizar restaurante
```http
PUT /api/gastronomia/:id
```

### Eliminar restaurante
```http
DELETE /api/gastronomia/:id
```

## Estructura de los datos
- `id`
- `nombre`
- `municipio`
- `especialidad`

## Respuestas HTTP
- `200` - Operación realizada correctamente.
- `201` - Registro creado correctamente.
- `400` - Datos enviados incorrectamente.
- `404` - Restaurante no encontrado.

## Integración
Este microservicio se utiliza desde la página de gastronomía de SUCRE TURÍSTICO y desde el panel de administración.

## Almacenamiento
Actualmente la información se almacena en memoria mediante JavaScript. Los datos se reinician cuando se detiene el servidor.

La persistencia mediante base de datos será implementada posteriormente.
