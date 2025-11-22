# 🎓 Mapa de Correlatividades - Ingeniería Informática

Este proyecto es una herramienta interactiva de código abierto diseñada para visualizar el plan de estudios de la carrera de **Ingeniería en Informática** de la **UNLaM**.

El objetivo principal es ofrecer a los estudiantes una forma clara y actualizada de ver sus materias, entender las correlatividades y seguir su progreso en la carrera.

La idea nació de la necesidad de contar con una herramienta actualizada. eXISTE UNA PÁGINA QUE CUENTA CON EL PLAN DE 2009 Y 2023, pero estaba desactualizada respecto a los últimos cambios en el plan de estudios.

Este proyecto busca:
* **Actualizar la información** de correlatividades según los últimos planes (Plan 2023 / Modificaciones 2026).
* **Contribuir a la comunidad estudiantil** con una herramienta gratuita y fácil de usar.

## ✨ Características Principales

* **🗺️ Visualización Interactiva:** Mapa de grafos dinámico (usando *Vis.js*) que organiza las materias por año y cuatrimestre.
* **🎨 Estado por Colores:**
    * **Base:** Colores distintivos por año para identificar rápidamente el nivel.
    * **🟢 Aprobada:** Marca tus materias aprobadas (se guardan automáticamente).
    * **🟡 Habilitada:** El sistema calcula automáticamente qué materias puedes cursar basándose en tus aprobadas.
* **💾 Persistencia de Datos:** Tu progreso se guarda en el navegador (LocalStorage), así no pierdes tu selección al recargar.
* **📊 Barra de Progreso:** Visualiza tu porcentaje de avance en la carrera en tiempo real.
* **🔗 Flechas Inteligentes:** Conexiones curvas que facilitan la lectura del flujo de correlatividades.

## 🛠️ Tecnologías Utilizadas
* **HTML5** y **CSS3**
* **JavaScript** (Vanilla ES6+)
* **[Vis.js Network](https://visjs.org/)** (Librería para grafos)

## 📄 Licencia

Este proyecto es de uso libre para la comunidad estudiantil.