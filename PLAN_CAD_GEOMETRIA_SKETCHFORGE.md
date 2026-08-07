# Plan maestro: SketchForge CAD centrado en Geometria

## Estado de la entrega base - 2026-08-05

La primera ruta vertical ya esta implementada y validada como modelado directo:
el usuario permanece en el viewport de Geometria, elige plano base, plano offset
o una cara, y dibuja circulos, arcos y rectangulos por arrastre directamente en
la escena 3D. El plano y el perfil se visualizan como overlays tridimensionales;
no se abre el lienzo Boceto ni el panel CAP. Un perfil cerrado puede extruirse
como cuerpo/adicion o usarse para cortar, con profundidad numerica. Boceto queda
como editor independiente y opcional.

Esta entrega tambien conserva los documentos CAP/SKF existentes, registra el id
topologico de la cara junto al respaldo geometrico y mantiene la linea de tiempo
de operaciones. Las fases de CAD avanzado enumeradas mas abajo (restricciones
asociativas completas, patrones, shell, draft, sweep, loft y recomputacion de un
arbol parametrico completo) siguen siendo evolucion del producto; no deben
confundirse con funciones ya terminadas en esta primera entrega.

## 1. Objetivo

Evolucionar SketchForge hacia un CAD hibrido, directo y parametrico, sin perder el flujo simple de arrastrar piezas.

- `Geometria` sera el entorno principal para crear, dibujar y modificar cuerpos 3D.
- `Boceto` seguira disponible como editor 2D independiente y preciso.
- El panel personalizado CAP/`Planos de trabajo` dejara de controlar la experiencia de `Boceto`.
- La infraestructura existente de perfiles, planos, extrusiones, revoluciones y booleanos se reutilizara desde `Geometria`.
- Los proyectos `.skf` existentes conservaran compatibilidad de lectura y migracion.

## 2. Principios no negociables

1. No eliminar `Boceto` ni degradar sus herramientas actuales.
2. No duplicar el motor de dibujo: Boceto y Geometria deben compartir modelo y controlador.
3. Los cuerpos CAD nativos usaran B-Rep exacto como fuente; Three.js sera la representacion visual.
4. Las operaciones deben ser reversibles, serializables y compatibles con undo/redo.
5. Los STL seguiran soportados como mallas, mostrando claramente sus limitaciones.
6. Toda fase debe cerrar con pruebas, typecheck y build antes de avanzar.

## 3. Arquitectura objetivo

```text
Documento SKF
|- Bodies
|  |- B-Rep exacto
|  `- tessellation de visualizacion
|- ConstructionFeatures
|  |- planes
|  |- ejes
|  `- puntos
|- SketchFeatures
|  |- soporte plano/cara
|  |- entidades analiticas
|  |- restricciones
|  `- regiones
`- ModelFeatures
   |- extrude / revolve
   |- hole / shell / draft
   |- sweep / loft / rib
   |- fillet / chamfer
   `- pattern / mirror / split
```

El controlador de boceto sera compartido por dos presentaciones:

- `SketchWorkspace`: lienzo 2D independiente de la pestana Boceto.
- `GeometrySketchSession`: dibujo contextual sobre un plano dentro del viewport 3D.

## 4. Fases

### Fase 0 - Contratos y compatibilidad

- Versionar este plan como contrato de implementacion.
- Mantener lectura de `CapDocument` y `CapSection` heredados.
- Definir pruebas de apertura y round-trip de `.skf`.
- Establecer stop rules: no avanzar si typecheck, pruebas unitarias o build fallan por el cambio activo.

### Fase 1 - Restaurar Boceto como editor 2D independiente

- Retirar visualmente `CapWorkspace` y `Planos de trabajo` de la pestana Boceto.
- Mantener el lienzo, grid, snap, imagenes, seleccion, medida, undo y redo.
- Conservar circulo, semicirculo, arco, rectangulo, linea, Bezier y curva suave.
- Mantener la capacidad de generar una extrusion/revolucion sencilla desde un perfil cuando el usuario la solicite.
- No borrar datos CAP heredados; solo dejar de exponer su panel en Boceto.

### Fase 2 - Nucleo compartido de sesiones de dibujo

- Separar estado, comandos y validacion del render del boceto.
- Definir `SketchSession` con soporte, perfil, herramienta, seleccion e historial.
- Reutilizar las entidades y materializacion existentes.
- Preparar adaptadores de coordenadas 2D y plano 3D.

### Fase 3 - Planos de construccion en Geometria

- Incorporar grupo `Construir` en la barra de Geometria.
- Soportar plano XY/XZ/YZ, offset y cara seleccionada.
- Anadir posteriormente plano medio, tres puntos, punto-normal, angular y tangente.
- Permitir mostrar, ocultar, seleccionar y renombrar planos.

### Fase 4 - Dibujo contextual dentro de Geometria

- Incorporar grupo `Dibujar` junto a Seleccionar.
- Activar una sesion sobre cara o plano sin abandonar el viewport.
- Proyectar raton y snaps al marco local del plano.
- Mostrar regiones cerradas y geometria de referencia.
- Herramientas iniciales: linea, circulo, arco y rectangulo.
- Herramientas ampliadas: polilinea, poligono, slot, elipse, spline, trim, extend y offset.

### Fase 5 - Regiones y operaciones primarias

- Convertir contornos cerrados en regiones seleccionables.
- Extruir con modos `nuevo cuerpo`, `anadir`, `cortar` e `intersectar`.
- Push/Pull con distancia numerica y vista previa.
- Direccion simple, simetrica, hasta cara, hasta siguiente y a traves de todo.
- Revolucion con eje y rango angular editables.

### Fase 6 - Herramientas CAD de uso frecuente

- Feature de agujero: simple, ciego, pasante, avellanado y counterbore.
- Shell, draft, offset/mover/eliminar cara y reparacion.
- Split face y split body.
- Proyeccion e interseccion de geometria.
- Mirror de cuerpos, caras y features.
- Patrones lineal, circular y sobre trayectoria.

### Fase 7 - Operaciones avanzadas

- Sweep con perfil y trayectoria.
- Loft entre perfiles compatibles.
- Rib/nervio y thicken/engrosar.
- Curvas 3D y trayectorias compuestas.
- Fillet/chamfer variables y cadenas tangentes.
- Roscas cosmeticas y, opcionalmente, geometricas.

### Fase 8 - Historial parametrico y topologia persistente

- Separar cuerpos, sketches y features del `WorkplaneShape` monolitico.
- Implementar grafo aciclico de dependencias y regeneracion incremental.
- Guardar parametros y entradas de cada feature.
- Resolver referencias a caras/aristas mediante firmas geometricas y procedencia semantica.
- Marcar features rotas y ofrecer reasignacion del soporte.

### Fase 9 - Formato SKF y migracion

- Versionar el schema del documento.
- Migrar `CapSection` a `SketchFeature` + feature de modelado equivalente.
- Preservar lectura de archivos antiguos.
- Guardar restricciones, dimensiones, planos y dependencias.
- Mantener assets deduplicados y validacion segura del ZIP.

### Fase 10 - Rendimiento, UX y calidad

- Ejecutar operaciones B-Rep en workers cancelables.
- Preview progresivo y tessellation por nivel de detalle.
- Barra contextual por cuerpo/cara/arista/region.
- Buscador de comandos y entrada numerica durante el dibujo.
- Secciones, interferencias, volumen, area, masa y espesor minimo.
- Pruebas de regresion visual, round-trip, topologia, worker y exportacion STEP.

## 5. Primera ruta vertical obligatoria

Antes de ampliar el catalogo, este flujo debe quedar completo:

```text
Seleccionar cara en Geometria
-> crear circulo
-> reconocer region
-> crear agujero pasante
-> guardar SKF
-> reabrir
-> editar diametro
-> regenerar
-> exportar STEP
```

## 6. Criterios de cierre

- Boceto funciona sin el panel CAP y conserva sus herramientas.
- Geometria permite dibujar sobre plano y cara sin cambiar de pestana.
- Undo/redo trata cada feature como una transaccion.
- Los `.skf` heredados cargan sin perdida.
- Los cuerpos CAD exportan STEP exacto; las mallas declaran sus limitaciones.
- Los workers no bloquean la interfaz y los errores dejan el documento consistente.
- Typecheck, pruebas unitarias y build de produccion permanecen verdes.
