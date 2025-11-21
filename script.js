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
        color: { color: '#9090acff' },
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
        // Nivel jerárquico en el mapa
        level: (materia.anio-1) *2 + (materia.cuatrimestre - 1), 
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

    const opciones = {
        layout: {
            hierarchical: {
                direction: "LR", 
                sortMethod: "directed",
                levelSeparation: 250, 
                nodeSpacing: 100, 
                treeSpacing: 200, 
                blockShifting: false,
                edgeMinimization: false, 
                parentCentralization: false 
            }
        },
        physics: {
            enabled: false // Desactivamos física desde el inicio para que sea estático y ordenado
        },
        interaction: {
            dragNodes: true, 
            zoomView: true,
            hover: false 
        },
        nodes: {
            font: { size: 14, face: 'Arial' },
            borderWidth: 2,
            widthConstraint: { maximum: 200 },
        }
    };

    const network = new vis.Network(container, datosGrafo, opciones);
    
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