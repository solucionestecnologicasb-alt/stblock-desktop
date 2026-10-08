# Integración del Panel de Tutor en STBlock

## Archivos Creados

```
src/components/tutor-panel/
├── index.js                    # Exportaciones del módulo
├── tutor-panel.jsx             # Componente principal
├── tutor-panel.css             # Estilos del panel principal
├── tutor-ejercicio-editor.jsx  # Editor de ejercicios
├── tutor-ejercicio-editor.css  # Estilos del editor
├── tutor-preview.jsx           # Vista previa de evaluaciones
├── tutor-preview.css           # Estilos de preview
├── tutor-storage.js            # Persistencia (localStorage)
├── tutor-templates.js          # Plantillas predefinidas
├── tutor-types.js              # Tipos de ejercicios
└── INTEGRACION.md              # Este archivo
```

---

## Paso 1: Agregar import en gui.jsx

En `src/components/gui/gui.jsx`, agregar al inicio del archivo:

```jsx
import TutorPanel from '../tutor-panel';
```

---

## Paso 2: Agregar estado para el modal

Dentro del componente GUIComponent, agregar el estado:

```jsx
const [showTutorPanel, setShowTutorPanel] = useState(false);
```

---

## Paso 3: Agregar atajo de teclado (Ctrl+Shift+T)

En el useEffect de keydown o donde se manejen atajos:

```jsx
useEffect(() => {
    const handleKeyDown = (e) => {
        // Ctrl+Shift+T para abrir panel de tutor
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            setShowTutorPanel(true);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Paso 4: Agregar botón en MenuBar (opcional)

En `src/components/menu-bar/menu-bar.jsx`, agregar un botón:

```jsx
// En los imports
import tutorIcon from './icon--tutor.svg'; // Crear icono

// En el JSX del menú
<div
    className={classNames(styles.menuBarItem, styles.hoverable)}
    onClick={onOpenTutorPanel}
    title="Panel de Tutor (Ctrl+Shift+T)"
>
    <img src={tutorIcon} />
    <span className={styles.collapsibleLabel}>Tutor</span>
</div>
```

---

## Paso 5: Renderizar el componente

Al final del return en GUIComponent, antes del cierre de `<Box>`:

```jsx
{showTutorPanel && (
    <TutorPanel
        isOpen={showTutorPanel}
        onClose={() => setShowTutorPanel(false)}
    />
)}
```

---

## Ejemplo Completo de Integración

```jsx
// En gui.jsx

import React, { useState, useEffect } from 'react';
import TutorPanel from '../tutor-panel';

const GUIComponent = (props) => {
    const [showTutorPanel, setShowTutorPanel] = useState(false);

    // Atajo de teclado Ctrl+Shift+T
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                setShowTutorPanel(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <Box className={styles.pageWrapper}>
            {/* ... resto del contenido ... */}

            {/* Panel de Tutor */}
            {showTutorPanel && (
                <TutorPanel
                    isOpen={showTutorPanel}
                    onClose={() => setShowTutorPanel(false)}
                />
            )}
        </Box>
    );
};
```

---

## Características Implementadas

### Panel Principal
- ✅ Vista de lista de evaluaciones
- ✅ Búsqueda de evaluaciones
- ✅ Crear nueva evaluación
- ✅ Crear desde plantilla
- ✅ Duplicar evaluación
- ✅ Eliminar evaluación
- ✅ Exportar evaluación (JSON)
- ✅ Importar evaluación
- ✅ Estadísticas

### Editor de Ejercicios
- ✅ Configuración de metadata (título, tiempo, nivel, tags)
- ✅ Lista de ejercicios con drag & drop
- ✅ Agregar ejercicios por tipo
- ✅ Duplicar ejercicios
- ✅ Eliminar ejercicios
- ✅ Editor específico por tipo de ejercicio
- ✅ Vista previa en tiempo real

### Tipos de Ejercicios Soportados
- ✅ Quiz (opción múltiple)
- ✅ Verdadero/Falso
- ✅ Completar código
- ✅ Ordenar bloques
- ✅ ¿Qué hace este código?
- ✅ Selección múltiple
- ✅ Escribir código
- ✅ Relacionar columnas
- ⏳ Depurar código
- ⏳ Reto de ejecución

### Vista Previa
- ✅ Simulación completa como estudiante
- ✅ Verificación de respuestas
- ✅ Feedback visual (correcto/incorrecto)
- ✅ Barra de progreso
- ✅ Pantalla de resultados
- ✅ Reiniciar evaluación

### Plantillas Predefinidas
- ✅ Introducción a Bucles
- ✅ Movimiento Básico
- ✅ Condicionales
- ✅ Variables
- ✅ Evaluación vacía

---

## Paleta de Colores STBlock

```css
/* Colores principales */
--color-primary: #19663d;        /* Verde oscuro - header */
--color-accent: #00b359;         /* Verde brillante - botones */
--color-background: #f0f4f8;     /* Gris claro - fondo */
--color-surface: #ffffff;        /* Blanco - tarjetas */
--color-text: #3d4f66;           /* Gris azulado - texto */

/* Colores de ejercicios */
--quiz-color: #9966FF;           /* Morado */
--motion-color: #4C97FF;         /* Azul */
--control-color: #FFAB19;        /* Naranja */
--data-color: #FF8C1A;           /* Naranja oscuro */
--sound-color: #CF63CF;          /* Rosa */
--looks-color: #00B359;          /* Verde */
```

---

## Próximos Pasos

1. **Integrar en gui.jsx** usando las instrucciones anteriores
2. **Crear icono** para el menú (opcional)
3. **Probar** con Ctrl+Shift+T
4. **Agregar reducer** para Redux si se necesita estado global
5. **Conectar con sistema de pruebas** cuando esté listo

---

## API del Componente

```jsx
<TutorPanel
    isOpen={boolean}      // Si el modal está abierto
    onClose={() => void}  // Callback al cerrar
/>
```

---

## Storage API

```javascript
import TutorStorage from './tutor-storage';

// Evaluaciones
TutorStorage.getAllEvaluations();
TutorStorage.saveEvaluation(evaluation);
TutorStorage.getEvaluation(id);
TutorStorage.deleteEvaluation(id);
TutorStorage.duplicateEvaluation(id);

// Exportar/Importar
TutorStorage.downloadEvaluation(id);
TutorStorage.importFromFile(file);

// Estadísticas
TutorStorage.getStatistics();
```

---

*Documentación creada para STBlock - Julio 2026*
