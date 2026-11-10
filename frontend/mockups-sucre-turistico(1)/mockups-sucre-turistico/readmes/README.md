# FRONTEND - SUCRE TURÍSTICO

Frontend de la plataforma SUCRE TURÍSTICO.

El frontend permite visualizar la información turística y comunicarse con los tres microservicios del proyecto.

## Puerto

5173

## Ejecutar

Desde la carpeta principal del proyecto:

cd frontend

Instalar las dependencias:

npm.cmd install

Ejecutar el frontend:

npm.cmd run dev

Vite mostrará una dirección similar a:

http://localhost:5173/

Abrir esa dirección en el navegador.

## Microservicios utilizados

El frontend se comunica con los siguientes servicios:

Destinos:

http://localhost:3001/api/destinos

Alojamientos:

http://localhost:3002/api/alojamientos

Gastronomía:

http://localhost:3003/api/gastronomia

## Mockups

Los archivos HTML de la interfaz se encuentran en:

frontend/mockups-sucre-turistico(1)/mockups-sucre-turistico/

Entre las páginas se encuentran:

- inicio.html
- destinos.html
- alojamientos.html
- gastronomia.html
- experiencias.html
- eventos.html
- buscador.html
- destino-detalle.html
- admin-panel.html
- admin-gestion.html

## Panel de administración

El panel de administración permite gestionar actualmente:

- Destinos.
- Alojamientos.
- Gastronomía.

Permite realizar operaciones de:

- Crear.
- Consultar.
- Actualizar.
- Eliminar.

## Importante

Los tres microservicios deben estar ejecutándose antes de utilizar las funciones que consultan o modifican información.

Los tres servicios deben estar activos en:

- Puerto 3001 - destinos-service
- Puerto 3002 - alojamiento-service
- Puerto 3003 - gastronomia-service

El frontend funciona en:

- Puerto 5173

## Windows PowerShell

Si PowerShell presenta problemas con npm.ps1, utilizar:

npm.cmd install

npm.cmd run dev