const APROBADAS_KEY = 'mallaAprobadas';
const YEAR_COLORS = {
    1: 'oklch(83% 0.14 235)',
    2: 'oklch(73% 0.18 25)',
    3: 'oklch(83% 0.08 290)',
    4: 'oklch(77% 0.21 65)',
    5: 'oklch(91% 0.23 128)'
};

let globalYIngles = null;
let globalYCompu = null;
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

function calcularAlturasTransversales(network) {
    const idsIngles = ['901', '902', '903', '904'];
    const idsCompu = ['911', '912'];
    const todosTransversales = [...idsIngles, ...idsCompu];
    
    // Obtenemos posiciones de TODO el mapa
    const allNodeIds = network.body.data.nodes.getIds();
    const posiciones = network.getPositions(allNodeIds);
    
    let maxY = -Infinity;
    allNodeIds.forEach(id => {
        // Ignoramos transversales para buscar el suelo real
        if (!todosTransversales.includes(id) && posiciones[id]) {
            if (posiciones[id].y > maxY) {
                maxY = posiciones[id].y;
            }
        }
    });

    if (maxY === -Infinity) maxY = 0;
    globalYIngles = maxY + 100; 
    globalYCompu = globalYIngles + 100;  
}

// Usamos moveNode porque es lo único que vence al layout jerárquico
function aplicarPosicionesTransversales(network) {
    if (globalYIngles === null || globalYCompu === null) return;

    const idsIngles = ['901', '902', '903', '904'];
    const idsCompu = ['911', '912'];
    const todos = [...idsIngles, ...idsCompu];
    const posiciones = network.getPositions(todos);

    idsIngles.forEach(id => {
        if (posiciones[id]) {
            network.moveNode(id, posiciones[id].x, globalYIngles);
        }
    });

    idsCompu.forEach(id => {
        if (posiciones[id]) {
            network.moveNode(id, posiciones[id].x, globalYCompu);
        }
    });
}

//Actualización de Colores
function actualizarGrafo(datosGrafo, dataMaterias, network) {
    const esModoOscuro = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const colorFlechaInactiva = esModoOscuro ? 'oklch(60% 0 0)' : 'oklch(70% 0.05 260)';
    const colorFlechaActiva = esModoOscuro ? 'oklch(95% 0 0)' : 'oklch(0% 0 0)';

    const nodosActualizados = [];
    const aristasMap = {};
    datosGrafo.edges.getIds().forEach(id => {
        aristasMap[id] = { 
            id: id, 
            color: { color: colorFlechaInactiva },
            width: 1
        };
    });
    
    //Pintar APROBADAS (Verde) y PENDIENTES (Color del Año)
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
    
    //Calcular MATERIAS HABILITADAS y FLECHAS ACTIVAS
    dataMaterias.forEach(materia => {
        const tieneCorrelativas = materia.correlativas.length > 0;
        const todasCorrelativasAprobadas = materia.correlativas.every(
            corrId => materiasAprobadas.has(corrId)
        );

        if (tieneCorrelativas && todasCorrelativasAprobadas) {
            const materiaId = materia.id;
            if (!materiasAprobadas.has(materiaId)) {
                const colorHabilitado = 'oklch(85% 0.18 95)';
                
                let nodoExistente = nodosActualizados.find(n => n.id === materiaId);
                
                if (nodoExistente) {
                    nodoExistente.color.background = colorHabilitado;
                    nodoExistente.color.highlight.background = colorHabilitado;
                } else {
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
            }
            
            // ACTIVAR FLECHAS
            materia.correlativas.forEach(corrId => {
                const aristas = datosGrafo.edges.get({
                    filter: item => item.from === corrId && item.to === materiaId
                });

                aristas.forEach(arista => {
                    if (aristasMap[arista.id]) {
                        aristasMap[arista.id].color = { color: colorFlechaActiva };
                        aristasMap[arista.id].width = 2;
                    }
                });
            });
        }
    });
    datosGrafo.nodes.update(nodosActualizados);
    datosGrafo.edges.update(Object.values(aristasMap));
    
    //Barra de Progreso
    const totalMaterias = dataMaterias.length;
    const aprobadasCount = materiasAprobadas.size;
    const porcentaje = Math.round((aprobadasCount / totalMaterias) * 100);

    const barra = document.getElementById('progress-fill');
    const texto = document.getElementById('progress-text');

    if (barra && texto) {
        barra.style.width = `${porcentaje}%`;
        texto.innerText = `${aprobadasCount} de ${totalMaterias} (${porcentaje}%)`;
        
        if (porcentaje === 100) {
            texto.style.color = 'oklch(60% 0.22 145)';
            texto.innerText = "¡Carrera Completada! 🎉";
        } else {
            texto.style.color = 'var(--text-muted)';
        }
    }

    network.unselectAll();
    aplicarPosicionesTransversales(network);
}

//Función Principal
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
        level: (materia.anio - 1) * 2 + (materia.cuatrimestre - 1), 
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
        physics: { enabled: false },
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
            color: { color: 'oklch(70% 0.05 260)' }
        },
        nodes: {
            font: { 
                face: 'Verdana',
                size: 14, 
                vadjust: 0
            },
            borderWidth: 2,
            widthConstraint: { maximum: 200 },
        }
    };

    const network = new vis.Network(container, datosGrafo, opciones);
    network.once("afterDrawing", () => {
        calcularAlturasTransversales(network);
        actualizarGrafo(datosGrafo, dataMaterias, network);
    });

    // --- EVENTOS ---
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

    //Botón Limpiar
    const btnLimpiar = document.getElementById('clear');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            materiasAprobadas.clear();
            guardarAprobadas();
            actualizarGrafo(datosGrafo, dataMaterias, network);
        });
    }

    //Modo Oscuro
    const btnTema = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const temaGuardado = localStorage.getItem('temaPreferido');
    if (temaGuardado === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        setTimeout(() => actualizarGrafo(datosGrafo, dataMaterias, network), 100);
    }

    if (btnTema) {
        btnTema.addEventListener('click', function() {
            if (htmlElement.getAttribute('data-theme') === 'dark') {
                htmlElement.removeAttribute('data-theme');
                localStorage.setItem('temaPreferido', 'light');
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('temaPreferido', 'dark');
            }
            actualizarGrafo(datosGrafo, dataMaterias, network);
        });
    }
}

dibujarGrafoCorrelativas();