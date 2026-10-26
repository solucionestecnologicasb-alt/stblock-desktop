# STBlock Kids: modo Robot

El modo Robot reutiliza el editor y el motor de ejecucion de ScratchJr, con un
proyecto propio. En este modo se muestra un unico personaje como robot y los
mapas integrados (Aula, Ciudad y Jardin). La paleta conserva bandera, avance,
retroceso, giro, repeticion y fin; oculta personajes, paginas y categorias de
apariencia/sonido.

## Protocolo serie Bluetooth

El modal Bluetooth de STBlock abre un puerto serie Bluetooth a 9600 baudios.
Cada orden termina con salto de linea:

| Orden | Significado |
| --- | --- |
| `MOVE,FWD,n` | Avanzar `n` unidades del bloque ScratchJr |
| `MOVE,BACK,n` | Retroceder `n` unidades del bloque ScratchJr |
| `TURN,LEFT,n` | Girar a la izquierda `n` incrementos de 30 grados |
| `TURN,RIGHT,n` | Girar a la derecha `n` incrementos de 30 grados |
| `STOP` | Detener el movimiento |

El motor ScratchJr anima el mismo programa en el mapa y transmite una orden al
inicio de cada bloque de avance o giro. El firmware Arduino debe implementar
este protocolo, poner en cola las ordenes de movimiento mientras el robot esta
ocupado y detener los motores al recibir `STOP`. La distancia fisica por unidad
depende de cada robot y se debe calibrar en su firmware.
