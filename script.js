const APROBADAS_KEY = 'mallaAprobadas';
const YEAR_COLORS = {
    1: '#80D8FF', // Año 1: Aguamarina
    2: '#FF8A80', // Año 2: Magenta Suave
    3: '#D1C4E9', // Año 3: Lavanda Profundo
    4: '#FFAB40', // Año 4: Naranja Coral
    5: '#CCFF90'  // Año 5: Lima Pastel
};
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

function actualizarGrafo(datosGrafo, dataMaterias, network) {
    const nodosActualizados = [];
    const aristasActualizadas = datosGrafo.edges.getIds().map(id => ({ 
        id, 
        color: { color: '#9090acff' },
        width: 1
    }));
    
    //Pintar APROBADAS (Verde) o color base
    dataMaterias.forEach(materia => {
        const isApproved = materiasAprobadas.has(materia.id);
        let colorBase = YEAR_COLORS[materia.anio] || '#ADD8E6';
        let colorFondo = isApproved ? '#3bf33bff' : colorBase;       
        nodosActualizados.push({
            id: materia.id,
            color: { 
                background: colorFondo, 
                border: '#2e74beff',
                highlight: {
                    background: colorFondo,
                    border: '#004A99'
                }
            }
        });
    });
    
    //Calcular y Pintar HABILITADAS (Amarillo)
    dataMaterias.forEach(materia => {
        const tieneCorrelativas = materia.correlativas.length > 0;
        const todasCorrelativasAprobadas = materia.correlativas.every(
            corrId => materiasAprobadas.has(corrId)
        );
        if (tieneCorrelativas && todasCorrelativasAprobadas) {
            const materiaId = materia.id;
            if (!materiasAprobadas.has(materiaId)) {
                nodosActualizados.push({
                    id: materiaId,
                    color: { 
                        background: '#FFD700', 
                        border: '#004A99',
                        highlight: {
                             background: '#FFD700', 
                             border: '#004A99',
                        }
                    } 
                });
            }
            
            // Resaltar flechas habilitadas
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
            enabled: false
        },
        interaction: {
            dragNodes: true, 
            zoomView: true,
            hover: false 
        },
        edges: {
            smooth: {
                enabled: true,
                type: 'cubicBezier',
                forceDirection: 'horizontal',
                roundness: 0.5
            },
            color: {
                color: '#9090acff', 
                highlight: 'black'
            }
        },
        nodes: {
            font: { size: 14, face: 'Arial' },
            borderWidth: 2,
            widthConstraint: { maximum: 200 },
        }
    };

    const network = new vis.Network(container, datosGrafo, opciones);
    
    actualizarGrafo(datosGrafo, dataMaterias, network);

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

    const btnLimpiar = document.getElementById('clear');
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            materiasAprobadas.clear();
            guardarAprobadas();
            actualizarGrafo(datosGrafo, dataMaterias, network);
        });
    }
}

dibujarGrafoCorrelativas();