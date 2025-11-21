async function dibujarGrafoCorrelativas(){
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

    // 3. Configuración y Dibujo del Grafo
    const container = document.getElementById('network');
    const datosGrafo = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const opciones = {
        // Habilitamos el layout jerárquico (útil para mallas curriculares)
        layout: {
            hierarchical: {
                direction: "LR", // De Izquierda a Derecha (L-R)
                sortMethod: "directed",
                levelSeparation: 250 // Espacio entre semestres
            }
        },
        // Opciones de interacción (zoom, arrastrar)
        interaction: {
            dragNodes: true,
            zoomView: true
        },
        // Opciones de estilo para los nodos
        nodes: {
            font: {
                size: 14,
                face: 'Arial'
            },
            color: {
                border: '#004A99',
                background: '#ADD8E6',
                highlight: {
                    border: '#001F4C',
                    background: '#D6F0FF'
                }
            }
        }
        // Puedes añadir más opciones para personalizar los bordes, colores, etc.
    };

    // 4. Crear la instancia del mapa (red)
    const network = new vis.Network(container, datosGrafo, opciones);

    // 5. AÑADIR INTERACTIVIDAD (Resaltado al hacer clic)
    network.on("click", function (propiedades) {
        const nodeId = propiedades.nodes[0]; // Obtener el ID del nodo clickeado
        
        // Si no se hizo clic en ningún nodo (ej. clic en el fondo), salir
        if (!nodeId) return; 

        // 1. Resetear el estilo de todos los nodos y aristas
        const todosLosNodos = datosGrafo.nodes.getIds();
        const todasLasAristas = datosGrafo.edges.getIds();
        
        // Resetear nodos (quitando el resaltado)
        datosGrafo.nodes.update(todosLosNodos.map(id => ({ id, color: { background: '#ADD8E6' } })));
        
        // Resetear aristas (haciéndolas transparentes o de color base)
        datosGrafo.edges.update(todasLasAristas.map(id => ({ id, color: { color: 'lightgray' } })));


        // 2. Resaltar las correlativas y las materias siguientes
        const nodoSeleccionado = datosGrafo.nodes.get(nodeId);
        
        // Buscar aristas relacionadas
        const aristasRelacionadas = datosGrafo.edges.get({
            filter: function (item) {
                // Aristas donde el nodo seleccionado es la correlativa (item.from)
                const esCorrelativa = item.from === nodeId; 
                // Aristas donde el nodo seleccionado requiere la correlativa (item.to)
                const esSiguiente = item.to === nodeId;     
                return esCorrelativa || esSiguiente;
            }
        });

        // 3. Aplicar resaltado
        
        // Resaltar el nodo clickeado
        datosGrafo.nodes.update([{
            id: nodeId,
            color: { background: '#FFD700' } // Amarillo para el seleccionado
        }]);

        aristasRelacionadas.forEach(arista => {
            const esCorrelativa = arista.from === nodeId; // El clic habilita A
            const esSiguiente = arista.to === nodeId;     // El clic es habilitado por B

            // Si el nodo clickeado es la correlativa (habilita otras materias)
            if (esCorrelativa) {
                datosGrafo.nodes.update([{
                    id: arista.to,
                    color: { background: '#32CD32' } // Verde para las materias HABILITADAS
                }]);
            }
            // Si el nodo clickeado requiere otras correlativas
            else if (esSiguiente) {
                datosGrafo.nodes.update([{
                    id: arista.from,
                    color: { background: '#FFA07A' } // Salmón para las correlativas REQUERIDAS
                }]);
            }

            // Resaltar la línea (arista)
            datosGrafo.edges.update([{
                id: arista.id,
                color: { color: 'black', highlight: 'black' },
                width: 2
            }]);
        });
    });
}

dibujarGrafoCorrelativas();