const APROBADAS_KEY = 'mallaAprobadas';
const YEAR_COLORS = {
    1: 'oklch(83% 0.14 235)', // Año 1
    2: 'oklch(73% 0.18 25)',  // Año 2
    3: 'oklch(83% 0.08 290)', // Año 3
    4: 'oklch(77% 0.21 65)',  // Año 4
    5: 'oklch(91% 0.23 128)'  // Año 5
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
        color: { color: 'oklch(70% 0.05 260)' },
        width: 1
    }));
    
    //Pintar APROBADAS (Verde) o color base
    dataMaterias.forEach(materia => {
        const isApproved = materiasAprobadas.has(materia.id);
        let colorBase = YEAR_COLORS[materia.anio] || 'oklch(90% 0 0)';
        let colorFondo = isApproved ? 'oklch(80% 0.22 145)' : colorBase;       
        nodosActualizados.push({
            id: materia.id,
            color: { 
                background: colorFondo, 
                border: 'oklch(45% 0.15 260)',
                highlight: {
                    background: colorFondo,
                    border: 'oklch(45% 0.15 260)'
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
                const colorHabilitado = 'oklch(85% 0.18 95)'
                nodosActualizados.push({
                    id: materiaId,
                    color: { 
                        background: colorHabilitado, 
                        border: 'oklch(45% 0.15 260)',
                        highlight: {
                             background: colorHabilitado, 
                             border: 'oklch(45% 0.15 260)',
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
                        color: { color: 'oklch(20% 0 0)' }, 
                        width: 2
                    });
                }
            });
        }
    });
    
    datosGrafo.nodes.update(nodosActualizados);
    datosGrafo.edges.update(aristasActualizadas);
    
    const totalMaterias = dataMaterias.length;
    const aprobadasCount = materiasAprobadas.size;
    const porcentaje = Math.round((aprobadasCount / totalMaterias) * 100);

    const barra = document.getElementById('progress-fill');
    const texto = document.getElementById('progress-text');

    if (barra && texto) {
        barra.style.width = `${porcentaje}%`;
        texto.innerText = `${aprobadasCount} de ${totalMaterias} (${porcentaje}%)`;
        
        // Opcional: Cambiar color de texto si se completa
        if (porcentaje === 100) {
            texto.style.color = 'oklch(60% 0.22 145)';
            texto.innerText = "¡Carrera Completada! 🎉";
        } else {
            texto.style.color = 'oklch(45% 0 0)';
        }
    }

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
                color: 'oklch(70% 0.05 260)', 
                highlight: 'oklch(0% 0 0)'
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