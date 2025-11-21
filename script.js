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

// --- 2. Función de Actualización de Colores ---
function actualizarGrafo(datosGrafo, dataMaterias, network) {
    const nodosActualizados = [];
    const aristasActualizadas = datosGrafo.edges.getIds().map(id => ({ 
        id, 
        color: { color: 'lightgray' },
        width: 1
    }));
    
    // A. Pintar APROBADAS (Verde) y PENDIENTES (Azul)
    dataMaterias.forEach(materia => {
        const isApproved = materiasAprobadas.has(materia.id);
        let color = isApproved ? '#3bf33bff' : '#ADD8E6'; 
        
        nodosActualizados.push({
            id: materia.id,
            color: { background: color }
        });
    });
    
    // B. Calcular y Pintar HABILITADAS (Amarillo)
    dataMaterias.forEach(materia => {
        const todasCorrelativasAprobadas = materia.correlativas.every(
            corrId => materiasAprobadas.has(corrId)
        );

        if (todasCorrelativasAprobadas) {
            const materiaId = materia.id;

            if (!materiasAprobadas.has(materiaId)) {
                nodosActualizados.push({
                    id: materiaId,
                    color: { background: '#FFD700' } 
                });
            }
            
            materia.correlativas.forEach(corrId => {
                const arista = datosGrafo.edges.get({
                    filter: item => item.from === corrId && item.to === materiaId
                });

                if (arista && arista.length > 0) {
                    aristasActualizadas.push({
                        id: arista[0].id,
                        color: { color: 'black' }, 
                        width: 2
                    });
                }
            });
        }
    });
    
    datosGrafo.nodes.update(nodosActualizados);
    datosGrafo.edges.update(aristasActualizadas);
    network.unselectAll(); 
}


// --- 3. Función Principal de Dibujo ---
async function dibujarGrafoCorrelativas(){
    const response = await fetch('mapa_correlatividades.json');
    if (!response.ok) {
        console.error("Error al cargar el JSON.");
        return;
    }
    const dataMaterias = await response.json();
    
    cargarAprobadas();

    const nodes = dataMaterias.map(materia => ({
        id: materia.id,
        label: materia.label,
        // Nivel jerárquico: Año + decimal de cuatrimestre
        level: materia.anio + (materia.cuatrimestre / 10), 
        shape: 'box',
        correlativas: materia.correlativas 
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

    // --- AQUÍ ESTÁN LOS CAMBIOS CLAVE EN LA CONFIGURACIÓN ---
    const opciones = {
        layout: {
            hierarchical: {
                direction: "LR", 
                sortMethod: "directed",
                levelSeparation: 300, // Tu ajuste (distancia horizontal)
                
                // --- CORRECCIÓN DEL CAOS VISUAL ---
                nodeSpacing: 100,     // Aumentamos espacio vertical entre nodos (antes era 100)
                treeSpacing: 200,     // Espacio entre árboles diferentes
                blockShifting: false, // Evita que los bloques se muevan para compactar
                edgeMinimization: false, // Evita cruces raros de líneas que desordenan todo
                parentCentralization: false // Mantiene el orden estricto
            }
        },
        physics: {
            enabled: false // Desactivamos física desde el inicio para que sea estático y ordenado
        },
        interaction: {
            dragNodes: false, 
            zoomView: true,
            hover: false // --- CORRECCIÓN DEL HOVER: Desactivado para no perder el color ---
        },
        nodes: {
            font: { size: 14, face: 'Arial' },
            borderWidth: 2,
            widthConstraint: { maximum: 200 }, // Evita que nodos con texto largo sean eternos
            color: {
                border: '#004A99',
                background: '#ADD8E6',
                highlight: { // Color del borde al seleccionar (opcional)
                    border: '#000000',
                    background: '#3bf33bff' 
                }
            }
        }
    };

    const network = new vis.Network(container, datosGrafo, opciones);
    
    // Aplicar colores iniciales
    actualizarGrafo(datosGrafo, dataMaterias, network);

   // --- 4. Manejo del Clic ---
    network.on("click", function (propiedades) {
        const nodeId = propiedades.nodes[0]; 
        
        if (nodeId) {
            if (materiasAprobadas.has(nodeId)) {
                materiasAprobadas.delete(nodeId); 
            } else {
                materiasAprobadas.add(nodeId);    
            }
            guardarAprobadas();
            actualizarGrafo(datosGrafo, dataMaterias, network);
        }
    });
}

dibujarGrafoCorrelativas();