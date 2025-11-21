async function dibujarGrafoCorrelativas() 
{
    const response = await fetch('mapa_correlatividades.json');
    if (!response.ok) {
        console.error("Error al cargar el archivo JSON de la malla.");
        return;
    }
    const dataMaterias = await response.json();
    const nodes = [];
    const edges = [];

    dataMaterias.forEach(materia => {
        nodes.push({
            id: materia.id,
            label: materia.label,
            level: materia.anio, // Usamos 'anio' para posicionar
            title: `Correlativas: ${materia.correlativas.join(', ')}`,
            shape: 'box',
        });

        // Crear las Aristas (correlatividades)
        materia.correlativas.forEach(correlativaId => {
            edges.push({
                from: correlativaId, // Va DESDE la correlativa previa
                to: materia.id,     // Hacia la materia actual
                arrows: 'to'        // Flecha indicando la dirección de la dependencia
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