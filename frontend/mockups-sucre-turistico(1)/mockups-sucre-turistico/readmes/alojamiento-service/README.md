# ALOJAMIENTO-SERVICE

Microservicio encargado de gestionar los alojamientos de SUCRE TURÍSTICO.

## Puerto

3002

## Ejecutar

Desde la carpeta principal del proyecto:

cd backend\alojamiento-service

Instalar las dependencias:

npm.cmd install

Ejecutar el servicio:

node server.js

El servicio funcionará en:

http://localhost:3002

## Endpoints

GET /api/alojamientos

GET /api/alojamientos/:id

POST /api/alojamientos

PUT /api/alojamientos/:id

DELETE /api/alojamientos/:id

## Funcionalidades

- Consultar alojamientos.
- Consultar un alojamiento por ID.
- Registrar alojamientos.
- Actualizar alojamientos.
- Eliminar alojamientos.

## Datos

Los alojamientos contienen:

- id
- nombre
- municipio
- tipo

Los datos se almacenan en memoria y vuelven a los datos iniciales al reiniciar el servicio.