# DESTINOS-SERVICE

Microservicio encargado de gestionar los destinos turísticos de SUCRE TURÍSTICO.

## Puerto

3001

## Ejecutar

Desde la carpeta principal del proyecto:

cd backend\destinos-service

Instalar las dependencias:

npm.cmd install

Ejecutar el servicio:

node server.js

El servicio funcionará en:

http://localhost:3001

## Endpoints

GET /api/destinos

GET /api/destinos/:id

POST /api/destinos

PUT /api/destinos/:id

DELETE /api/destinos/:id

## Funcionalidades

- Consultar destinos.
- Consultar un destino por ID.
- Registrar destinos.
- Actualizar destinos.
- Eliminar destinos.

## Datos

Los destinos contienen:

- id
- nombre
- municipio
- descripcion
- tipo

Los datos se almacenan en memoria y vuelven a los datos iniciales al reiniciar el servicio.