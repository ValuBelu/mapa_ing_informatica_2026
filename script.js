// --- 1. Variables Globales y Persistencia ---
const APROBADAS_KEY = 'mallaAprobadas';
let materiasAprobadas = new Set(); 

function cargarAprobadas() {
    const saved = localStorage.getItem(APROBADAS_KEY);
    if (saved) {
        materiasAprobadas = new Set(JSON.parse(saved));
    }
}

function guardarAprobadas() {
    localStorage.setItem(APROBADAS_KEY, JSON.stringify(Array.from(materiasAprobadas)));
}

// --- 2. Función de Actualización de Colores (Centraliza la lógica) ---
function actualizarGrafo(datosGrafo, dataMaterias, network) {
    const nodosActualizados = [];
    const aristasActualizadas = datosGrafo.edges.getIds().map(id => ({ 
        id, 
        color: { color: 'lightgray' },
        width: 1
    }));
    
    // 1. Establecer color base y color Aprobado (Verde)
    dataMaterias.forEach(materia => {
        const isApproved = materiasAprobadas.has(materia.id);
        let color = isApproved ? '#3bf33bff' : '#ADD8E6'; // Verde si aprobada, Azul si no
        
        nodosActualizados.push({
            id: materia.id,
            color: { background: color }
        });
    });
    
    // 2. Determinar y resaltar materias HABILITADAS (Amarillo)
    dataMaterias.forEach(materia => {
        // La materia solo se habilita si TODAS sus correlativas están en el Set de Aprobadas
        const todasCorrelativasAprobadas = materia.correlativas.every(
            corrId => materiasAprobadas.has(corrId)
        );

        if (todasCorrelativasAprobadas) {
            const materiaId = materia.id;

            // Si la materia está habilitada Y NO está ya aprobada
            if (!materiasAprobadas.has(materiaId)) {
                // Resaltar el nodo HABILITADO (AMARILLO)
                nodosActualizados.push({
                    id: materiaId,
                    color: { background: '#FFD700' } 
                });
            }
            
            // Resaltar las líneas que llevan a esta materia HABILITADA
            materia.correlativas.forEach(corrId => {
                const arista = datosGrafo.edges.get({
                    filter: item => item.from === corrId && item.to === materiaId
                });

                if (arista && arista.length > 0) {
                    aristasActualizadas.push({
                        id: arista[0].id,
                        color: { color: 'black', highlight: 'black' },
                        width: 2
                    });
                }
            });
        }
    });
    
    datosGrafo.nodes.update(nodosActualizados);
    datosGrafo.edges.update(aristasActualizadas);
    network.unselectAll(); // Deseleccionamos para que el highlight desaparezca si no queremos más interactividad
}


// --- 3. Función Principal de Dibujo ---
async function dibujarGrafoCorrelativas(){
    const response = await fetch('mapa_correlatividades.json');
    if (!response.ok) {
        console.error("Error al cargar el archivo JSON de la malla.");
        return;
    }
    const dataMaterias = await response.json();
    
    // Cargamos el estado al inicio
    cargarAprobadas();

    // Añadimos el array de correlativas al nodo para facilitar la lógica de actualización
    const nodes = dataMaterias.map(materia => ({
        id: materia.id,
        label: materia.label,
        level: materia.anio, 
        title: `Correlativas: ${materia.correlativas.join(', ')}`,
        shape: 'box',
        // El color inicial lo establecerá 'actualizarGrafo'
        correlativas: materia.correlativas // Incluimos la data de correlativas en el nodo Vis.js
    }));
    
    const edges = [];
    dataMaterias.forEach(materia => {
        materia.correlativas.forEach(correlativaId => {
            edges.push({
                from: correlativaId, 
                to: materia.id,     
                arrows: 'to'        
            });
        });
    });

    const container = document.getElementById('network');
    const datosGrafo = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const opciones = {
        layout: {
            hierarchical: {
                direction: "LR", 
                sortMethod: "directed",
                levelSeparation: 400 
            }
        },
        physics: {
            enabled: true,
            solver: 'repulsion', 
            repulsion: { nodeDistance: 150 },
            stabilization: { enabled: true, iterations: 1000, updateInterval: 25 }
        },
        interaction: {
            dragNodes: true, // Lo dejamos en true para arrastrar el lienzo
            zoomView: true,
            multiselect: false // CAMBIO: Lo desactivamos, ya no lo necesitamos
        },
        nodes: {
            font: { size: 14, face: 'Arial' },
            color: {
                border: '#004A99',
                background: '#ADD8E6',
                highlight: {
                    border: '#001F4C',
                    background: '#3cf13cff' // El highlight sigue siendo el verde
                }
            }
        }
    };

     const network = new vis.Network(container, datosGrafo, opciones);
    network.once('afterDrawing', function () {
         network.setOptions( { physics: false } );
        // Aplicamos los colores iniciales/persistentes
        actualizarGrafo(datosGrafo, dataMaterias, network);
    });

    // 4. Manejo del Clic (TOGGLE de Aprobación)
     network.on("click", function (propiedades) {
         const nodeId = propiedades.nodes[0]; 
        
        // El clic simple hace toggle de aprobación
         if (nodeId) {
             // TOGGLE: Si está, se quita; si no está, se agrega.
            if (materiasAprobadas.has(nodeId)) {
                 materiasAprobadas.delete(nodeId);
            } else {
             materiasAprobadas.add(nodeId);
            }

            // Actualizamos el estado persistente y los colores del grafo
             guardarAprobadas();
            actualizarGrafo(datosGrafo, dataMaterias, network);

        } else {
            // Si el clic es en el lienzo, actualizamos el grafo para limpiar cualquier residuo visual
            actualizarGrafo(datosGrafo, dataMaterias, network);
        }
    });
}

dibujarGrafoCorrelativas();