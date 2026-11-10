
import express from "express";
import cors from "cors";
import { Client } from "@elastic/elasticsearch";

const app = express();
const PORT = 3006;

app.use(cors());
app.use(express.json());

const elastic = new Client({
    node: process.env.ELASTIC_URL || "http://localhost:9200"
});

const INDICE = "sucre_turistico";

const API_GATEWAY = process.env.API_GATEWAY_URL || "http://localhost:3000";
function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
// Crear índice y configurar campos de búsqueda
async function crearIndice() {
    const existe = await elastic.indices.exists({
        index: INDICE
    });

    if (!existe) {
        await elastic.indices.create({
            index: INDICE,
            mappings: {
                properties: {
                    nombre: {
                        type: "search_as_you_type"
                    },
                    nombre_sugerencia: {
                        type: "completion"
                    },
                    municipio: {
                        type: "keyword"
                    },
                    descripcion: {
                        type: "text",
                        analyzer: "spanish"
                    },
                    tipo_contenido: {
                        type: "keyword"
                    },
                    categoria: {
                        type: "keyword"
                    },
                    imagen: {
                        type: "keyword",
                        index: false,
                        doc_values: false
                    },
                    fecha: {
                        type: "date",
                        format: "strict_date_optional_time||yyyy-MM-dd"
                    },
                    estado: {
                        type: "keyword"
                    },
                    nombre_busqueda: {
                        type: "text"
                    },
                    municipio_busqueda: {
    type: "text"
                    },
                    descripcion_busqueda: {
                         type: "text"
                    }
                    
                }
            }
        });

        console.log("Índice de Elasticsearch creado");
    } else {
        console.log("Índice de Elasticsearch ya existe");
    }
    await elastic.indices.putMapping({
    index: INDICE,
    properties: {
        nombre_busqueda: { type: "text" },
        municipio_busqueda: { type: "text" },
        descripcion_busqueda: { type: "text" }
    }
});
}

// Consultar los cinco microservicios
async function obtenerDatos() {
    const servicios = [
        { nombre: "destinos", ruta: "/api/destinos" },
        { nombre: "alojamientos", ruta: "/api/alojamientos" },
        { nombre: "gastronomia", ruta: "/api/gastronomia" },
        { nombre: "experiencias", ruta: "/api/experiencias" },
        { nombre: "eventos", ruta: "/api/eventos" }
    ];

    const resultados = await Promise.all(
        servicios.map(async servicio => {
            const respuesta = await fetch(
                `${API_GATEWAY}${servicio.ruta}`
            );

            if (!respuesta.ok) {
                throw new Error(
                    `Error consultando ${servicio.nombre}: ${respuesta.status}`
                );
            }

            return {
                tipo: servicio.nombre,
                datos: await respuesta.json()
            };
        })
    );

    return resultados;
}

// Normalizar los registros para Elasticsearch
function normalizarDatos(resultados) {
    const documentos = [];

    for (const grupo of resultados) {
        for (const item of grupo.datos) {

    // No indexar alojamientos que no estén publicados
    if (
        grupo.tipo === "alojamientos" &&
        String(item.estado || "").trim().toLowerCase() !== "publicado"
    ) {
        continue;
    }
            const categoria =
                item.especialidad || item.tipo || grupo.tipo;

            documentos.push({
                id: String(item.id),
                nombre: item.nombre || "",
                nombre_sugerencia: {
                    input: item.nombre ? [item.nombre] : []
                },
                municipio: item.municipio || "",
                descripcion: item.descripcion || "",
                tipo_contenido: grupo.tipo,
                categoria: categoria,
                imagen: item.imagen || "",
                fecha: item.fecha || null,
                estado: String(item.estado || "Publicado").trim().toLowerCase(),
                nombre_busqueda: normalizarTexto(item.nombre),
                municipio_busqueda: normalizarTexto(item.municipio),
                descripcion_busqueda: normalizarTexto(item.descripcion),
            });
        }
    }

    return documentos;
}

// INDEXAR LOS CINCO MICROSERVICIOS
app.post("/api/indexar", async (req, res) => {
    try {
        const resultados = await obtenerDatos();
        const documentos = normalizarDatos(resultados);

// Eliminar los alojamientos antiguos del índice.
// Así no quedan alojamientos rechazados o en borrador.
await elastic.deleteByQuery({
    index: INDICE,
    query: {
        term: {
            tipo_contenido: "alojamientos"
        }
    },
    refresh: true,
    conflicts: "proceed"
});

const operaciones = [];

        for (const documento of documentos) {
            operaciones.push({
                index: {
                    _index: INDICE,
                    _id: `${documento.tipo_contenido}-${documento.id}`
                }
            });

            operaciones.push(documento);
        }

        if (operaciones.length > 0) {
            const respuesta = await elastic.bulk({
                operations: operaciones,
                refresh: true
            });

            if (respuesta.errors) {
                console.error("Errores de indexación:", respuesta.items);
                return res.status(500).json({
                    error: "Algunos registros no pudieron indexarse"
                });
            }
        }

        res.json({
            mensaje: "Datos indexados correctamente",
            total: documentos.length,
            servicios: resultados.map(x => x.tipo)
        });

    } catch (error) {
        console.error("Error al indexar:", error);

        res.status(500).json({
            error: "Error al indexar los datos",
            detalle: error.message
        });
    }
});

// BUSCAR CONTENIDO
app.get("/api/buscar", async (req, res) => {
    try {
        const {
            q,
            municipio,
            categoria,
            tipo,
            size = 20
        } = req.query;

        const filtros = [];
        // Los alojamientos solo pueden aparecer si están publicados.
filtros.push({
    bool: {
        should: [
            {
                bool: {
                    must: [
                        { term: { tipo_contenido: "alojamientos" } },
                        { term: { estado: "publicado" } }
                    ]
                }
            },
            {
                bool: {
                    must_not: [
                        { term: { tipo_contenido: "alojamientos" } }
                    ]
                }
            }
        ],
        minimum_should_match: 1
    }
});
        if (municipio) {
            filtros.push({
                term: { municipio }
            });
        }

        if (categoria) {
            filtros.push({
                term: { categoria }
            });
        }

        if (tipo) {
            filtros.push({
                term: { tipo_contenido: tipo }
            });
        }

        const consulta = q
            ? {
                multi_match: {
                    query: q,
                    type: "bool_prefix",
                    fields: [
                    "nombre",
                    "nombre._2gram",
                    "nombre._3gram",
                    "descripcion",
                    "municipio"
                ],
                fuzziness: "AUTO"
                }
            }
            : { match_all: {} };

        const respuesta = await elastic.search({
            index: INDICE,
            size: Math.min(Math.max(Number(size) || 20, 1), 100),
            query: {
                bool: {
                    must: [consulta],
                    filter: filtros
                }
            },
            aggs: {
                municipios: {
                    terms: {
                        field: "municipio",
                        size: 30
                    }
                },
                categorias: {
                    terms: {
                        field: "categoria",
                        size: 30
                    }
                },
                tipos: {
                    terms: {
                        field: "tipo_contenido",
                        size: 10
                    }
                }
            }
        });

        res.json({
            total: respuesta.hits.total.value,
            resultados: respuesta.hits.hits.map(hit => ({
                ...hit._source,
                id: hit._source.id,
                identificador: hit._id
            })),
            filtros: {
                municipios: respuesta.aggregations.municipios.buckets,
                categorias: respuesta.aggregations.categorias.buckets,
                tipos: respuesta.aggregations.tipos.buckets
            }
        });

    } catch (error) {
        console.error("Error en la búsqueda:", error);

        res.status(500).json({
            error: "Error realizando la búsqueda",
            detalle: error.message
        });
    }
});

// SUGERENCIAS DE BÚSQUEDA
app.get("/api/sugerencias", async (req, res) => {
    try {
        const q = req.query.q;

        if (!q || q.trim().length < 2) {
            return res.json({ sugerencias: [] });
        }

        const respuesta = await elastic.search({
            index: INDICE,
            size: 0,
            suggest: {
                nombres: {
                    prefix: q,
                    completion: {
                        field: "nombre_sugerencia",
                        skip_duplicates: true,
                        size: 10
                    }
                }
            }
        });

        const opciones =
            respuesta.suggest.nombres[0].options.map(
                opcion => opcion.text
            );

        res.json({
            sugerencias: opciones
        });

    } catch (error) {
        console.error("Error en sugerencias:", error);

        res.status(500).json({
            error: "Error obteniendo sugerencias"
        });
    }
});

// ESTADO DEL BUSCADOR
app.get("/", async (req, res) => {
    try {
        const salud = await elastic.cluster.health();

        res.json({
            servicio: "buscador-service",
            estado: "funcionando",
            puerto: PORT,
            elasticsearch: salud.status,
            indice: INDICE
        });

    } catch (error) {
        res.status(500).json({
            servicio: "buscador-service",
            estado: "error",
            detalle: error.message
        });
    }
});

// INICIAR SERVIDOR
async function iniciarServidor() {
    try {
        await elastic.ping();
        console.log("Conectado a Elasticsearch");

        await crearIndice();

        app.listen(PORT, () => {
            console.log(
                `buscador-service funcionando en http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "No se pudo iniciar el buscador:",
            error.message
        );
        process.exit(1);
    }
}

iniciarServidor();
