/**
 * STBlock - Referencia completa de Python
 * Documentación interactiva de todos los bloques disponibles
 */

export const PYTHON_REFERENCE = {
    eventos: {
        name: 'Eventos',
        icon: '🚩',
        color: '#FFBF00',
        description: 'Bloques que inician scripts cuando ocurre algo',
        blocks: [
            {
                name: 'Al presionar bandera verde',
                python: 'def inicio():',
                description: 'Ejecuta el código cuando se presiona la bandera verde',
                example: `def inicio():
    sprite.decir("¡Hola!")
    sprite.mover(10)`,
                params: []
            },
            {
                name: 'Al presionar tecla',
                python: 'def al_presionar_TECLA():',
                description: 'Ejecuta el código cuando se presiona una tecla específica',
                example: `def al_presionar_espacio():
    sprite.saltar(10)

def al_presionar_derecha():
    sprite.mover(10)`,
                params: [
                    { name: 'TECLA', type: 'texto', desc: 'espacio, arriba, abajo, izquierda, derecha, o letra' }
                ]
            },
            {
                name: 'Al hacer clic en sprite',
                python: 'def al_hacer_clic():',
                description: 'Ejecuta el código cuando se hace clic en el sprite',
                example: `def al_hacer_clic():
    sprite.decir("¡Me clickeaste!")`,
                params: []
            },
            {
                name: 'Enviar mensaje',
                python: 'enviar_mensaje("nombre")',
                description: 'Envía un mensaje a todos los sprites',
                example: `enviar_mensaje("iniciar_juego")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del mensaje a enviar' }
                ]
            },
            {
                name: 'Al recibir mensaje',
                python: 'def al_recibir_MENSAJE():',
                description: 'Ejecuta el código al recibir un mensaje',
                example: `def al_recibir_iniciar_juego():
    sprite.mostrar()
    sprite.ir_a_xy(0, 0)`,
                params: [
                    { name: 'MENSAJE', type: 'texto', desc: 'Nombre del mensaje' }
                ]
            }
        ]
    },
    movimiento: {
        name: 'Movimiento',
        icon: '➡️',
        color: '#4C97FF',
        description: 'Bloques para mover y rotar sprites',
        blocks: [
            {
                name: 'Mover pasos',
                python: 'sprite.mover(pasos)',
                description: 'Mueve el sprite hacia adelante en la dirección actual',
                example: `sprite.mover(10)  # Avanza 10 pasos
sprite.mover(-5)  # Retrocede 5 pasos`,
                params: [
                    { name: 'pasos', type: 'número', desc: 'Cantidad de pasos a mover' }
                ]
            },
            {
                name: 'Girar derecha',
                python: 'sprite.girar_derecha(grados)',
                description: 'Gira el sprite en sentido horario',
                example: `sprite.girar_derecha(90)  # Gira 90° a la derecha
sprite.girar_derecha(15)  # Giro suave`,
                params: [
                    { name: 'grados', type: 'número', desc: 'Grados a girar (0-360)' }
                ]
            },
            {
                name: 'Girar izquierda',
                python: 'sprite.girar_izquierda(grados)',
                description: 'Gira el sprite en sentido antihorario',
                example: `sprite.girar_izquierda(90)`,
                params: [
                    { name: 'grados', type: 'número', desc: 'Grados a girar (0-360)' }
                ]
            },
            {
                name: 'Ir a posición',
                python: 'sprite.ir_a_xy(x, y)',
                description: 'Mueve el sprite instantáneamente a una posición',
                example: `sprite.ir_a_xy(0, 0)    # Centro del escenario
sprite.ir_a_xy(-200, 100)  # Esquina superior izquierda`,
                params: [
                    { name: 'x', type: 'número', desc: 'Posición horizontal (-240 a 240)' },
                    { name: 'y', type: 'número', desc: 'Posición vertical (-180 a 180)' }
                ]
            },
            {
                name: 'Deslizar a posición',
                python: 'sprite.deslizar_a_xy(x, y, segundos)',
                description: 'Desliza suavemente el sprite a una posición',
                example: `sprite.deslizar_a_xy(100, 50, 2)  # Desliza en 2 segundos`,
                params: [
                    { name: 'x', type: 'número', desc: 'Posición X destino' },
                    { name: 'y', type: 'número', desc: 'Posición Y destino' },
                    { name: 'segundos', type: 'número', desc: 'Duración del deslizamiento' }
                ]
            },
            {
                name: 'Apuntar en dirección',
                python: 'sprite.apuntar_en_direccion(grados)',
                description: 'Establece la dirección del sprite',
                example: `sprite.apuntar_en_direccion(0)    # Arriba
sprite.apuntar_en_direccion(90)   # Derecha
sprite.apuntar_en_direccion(180)  # Abajo
sprite.apuntar_en_direccion(-90)  # Izquierda`,
                params: [
                    { name: 'grados', type: 'número', desc: '0=arriba, 90=derecha, 180=abajo, -90=izquierda' }
                ]
            },
            {
                name: 'Cambiar X',
                python: 'sprite.cambiar_x(cantidad)',
                description: 'Mueve el sprite horizontalmente',
                example: `sprite.cambiar_x(10)   # Mover a la derecha
sprite.cambiar_x(-10)  # Mover a la izquierda`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Cantidad a mover en X' }
                ]
            },
            {
                name: 'Cambiar Y',
                python: 'sprite.cambiar_y(cantidad)',
                description: 'Mueve el sprite verticalmente',
                example: `sprite.cambiar_y(10)   # Mover arriba
sprite.cambiar_y(-10)  # Mover abajo`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Cantidad a mover en Y' }
                ]
            },
            {
                name: 'Fijar X',
                python: 'sprite.fijar_x(valor)',
                description: 'Establece la posición X del sprite',
                example: `sprite.fijar_x(0)  # Centrar horizontalmente`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Nueva posición X' }
                ]
            },
            {
                name: 'Fijar Y',
                python: 'sprite.fijar_y(valor)',
                description: 'Establece la posición Y del sprite',
                example: `sprite.fijar_y(0)  # Centrar verticalmente`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Nueva posición Y' }
                ]
            },
            {
                name: 'Rebotar en borde',
                python: 'sprite.rebotar_si_toca_borde()',
                description: 'Hace que el sprite rebote al tocar el borde',
                example: `while True:
    sprite.mover(10)
    sprite.rebotar_si_toca_borde()`,
                params: []
            },
            {
                name: 'Posición X',
                python: 'sprite.x',
                description: 'Obtiene la posición X actual del sprite',
                example: `if sprite.x > 200:
    sprite.decir("Estoy muy a la derecha")`,
                params: []
            },
            {
                name: 'Posición Y',
                python: 'sprite.y',
                description: 'Obtiene la posición Y actual del sprite',
                example: `posicion = sprite.y`,
                params: []
            },
            {
                name: 'Dirección',
                python: 'sprite.direccion',
                description: 'Obtiene la dirección actual del sprite',
                example: `angulo = sprite.direccion`,
                params: []
            }
        ]
    },
    apariencia: {
        name: 'Apariencia',
        icon: '🎨',
        color: '#9966FF',
        description: 'Bloques para cambiar cómo se ve el sprite',
        blocks: [
            {
                name: 'Decir',
                python: 'sprite.decir("mensaje")',
                description: 'Muestra un bocadillo de diálogo',
                example: `sprite.decir("¡Hola mundo!")
sprite.decir("Puntos: " + str(puntos))`,
                params: [
                    { name: 'mensaje', type: 'texto', desc: 'Texto a mostrar' }
                ]
            },
            {
                name: 'Decir por segundos',
                python: 'sprite.decir("mensaje", segundos)',
                description: 'Muestra un bocadillo por un tiempo',
                example: `sprite.decir("¡Bienvenido!", 2)`,
                params: [
                    { name: 'mensaje', type: 'texto', desc: 'Texto a mostrar' },
                    { name: 'segundos', type: 'número', desc: 'Duración' }
                ]
            },
            {
                name: 'Pensar',
                python: 'sprite.pensar("mensaje")',
                description: 'Muestra un bocadillo de pensamiento',
                example: `sprite.pensar("Hmm...")`,
                params: [
                    { name: 'mensaje', type: 'texto', desc: 'Texto del pensamiento' }
                ]
            },
            {
                name: 'Mostrar',
                python: 'sprite.mostrar()',
                description: 'Hace visible el sprite',
                example: `sprite.mostrar()`,
                params: []
            },
            {
                name: 'Esconder',
                python: 'sprite.esconder()',
                description: 'Hace invisible el sprite',
                example: `sprite.esconder()`,
                params: []
            },
            {
                name: 'Cambiar disfraz',
                python: 'sprite.cambiar_disfraz("nombre")',
                description: 'Cambia el disfraz del sprite',
                example: `sprite.cambiar_disfraz("disfraz2")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del disfraz' }
                ]
            },
            {
                name: 'Siguiente disfraz',
                python: 'sprite.siguiente_disfraz()',
                description: 'Cambia al siguiente disfraz',
                example: `for _ in range(10):
    sprite.siguiente_disfraz()
    esperar(0.1)`,
                params: []
            },
            {
                name: 'Cambiar tamaño',
                python: 'sprite.cambiar_tamaño(cantidad)',
                description: 'Aumenta o reduce el tamaño del sprite',
                example: `sprite.cambiar_tamaño(10)   # Crecer
sprite.cambiar_tamaño(-10)  # Encoger`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Porcentaje a cambiar' }
                ]
            },
            {
                name: 'Fijar tamaño',
                python: 'sprite.fijar_tamaño(porcentaje)',
                description: 'Establece el tamaño del sprite',
                example: `sprite.fijar_tamaño(100)  # Tamaño normal
sprite.fijar_tamaño(200)  # Doble tamaño
sprite.fijar_tamaño(50)   # Mitad de tamaño`,
                params: [
                    { name: 'porcentaje', type: 'número', desc: 'Tamaño en porcentaje (100=normal)' }
                ]
            },
            {
                name: 'Quitar efectos',
                python: 'sprite.quitar_efectos()',
                description: 'Elimina todos los efectos gráficos',
                example: `sprite.quitar_efectos()`,
                params: []
            },
            {
                name: 'Tamaño',
                python: 'sprite.tamaño',
                description: 'Obtiene el tamaño actual del sprite',
                example: `if sprite.tamaño > 100:
    sprite.decir("Soy grande")`,
                params: []
            }
        ]
    },
    sonido: {
        name: 'Sonido',
        icon: '🔊',
        color: '#CF63CF',
        description: 'Bloques para reproducir y controlar sonidos',
        blocks: [
            {
                name: 'Reproducir sonido',
                python: 'sonido.reproducir("nombre")',
                description: 'Reproduce un sonido sin esperar',
                example: `sonido.reproducir("pop")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del sonido' }
                ]
            },
            {
                name: 'Reproducir hasta terminar',
                python: 'sonido.reproducir_hasta_terminar("nombre")',
                description: 'Reproduce un sonido y espera a que termine',
                example: `sonido.reproducir_hasta_terminar("meow")
sprite.decir("Ya terminó el sonido")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del sonido' }
                ]
            },
            {
                name: 'Detener sonidos',
                python: 'sonido.detener_todos()',
                description: 'Detiene todos los sonidos',
                example: `sonido.detener_todos()`,
                params: []
            },
            {
                name: 'Fijar volumen',
                python: 'sonido.fijar_volumen(porcentaje)',
                description: 'Establece el volumen',
                example: `sonido.fijar_volumen(50)  # 50% volumen`,
                params: [
                    { name: 'porcentaje', type: 'número', desc: 'Volumen de 0 a 100' }
                ]
            },
            {
                name: 'Cambiar volumen',
                python: 'sonido.cambiar_volumen(cantidad)',
                description: 'Aumenta o reduce el volumen',
                example: `sonido.cambiar_volumen(-10)  # Bajar volumen`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Cantidad a cambiar' }
                ]
            },
            {
                name: 'Volumen',
                python: 'sonido.volumen',
                description: 'Obtiene el volumen actual',
                example: `vol = sonido.volumen`,
                params: []
            }
        ]
    },
    control: {
        name: 'Control',
        icon: '🔄',
        color: '#FFAB19',
        description: 'Bloques para controlar el flujo del programa',
        blocks: [
            {
                name: 'Esperar',
                python: 'esperar(segundos)',
                description: 'Pausa la ejecución por un tiempo',
                example: `sprite.decir("Esperando...")
esperar(2)
sprite.decir("¡Listo!")`,
                params: [
                    { name: 'segundos', type: 'número', desc: 'Tiempo de espera' }
                ]
            },
            {
                name: 'Repetir',
                python: 'for _ in range(veces):',
                description: 'Repite un bloque de código N veces',
                example: `for _ in range(10):
    sprite.mover(10)
    sprite.girar_derecha(36)`,
                params: [
                    { name: 'veces', type: 'número', desc: 'Número de repeticiones' }
                ]
            },
            {
                name: 'Por siempre',
                python: 'while True:',
                description: 'Repite un bloque de código infinitamente',
                example: `while True:
    sprite.mover(10)
    sprite.rebotar_si_toca_borde()`,
                params: []
            },
            {
                name: 'Si entonces',
                python: 'if condicion:',
                description: 'Ejecuta código si la condición es verdadera',
                example: `if sprite.tocando("enemigo"):
    sprite.decir("¡Auch!")
    sprite.cambiar_salud(-10)`,
                params: [
                    { name: 'condicion', type: 'booleano', desc: 'Condición a evaluar' }
                ]
            },
            {
                name: 'Si entonces / si no',
                python: 'if condicion: ... else:',
                description: 'Ejecuta código según la condición',
                example: `if puntos > 100:
    sprite.decir("¡Ganaste!")
else:
    sprite.decir("Sigue intentando")`,
                params: [
                    { name: 'condicion', type: 'booleano', desc: 'Condición a evaluar' }
                ]
            },
            {
                name: 'Repetir hasta que',
                python: 'while not condicion:',
                description: 'Repite hasta que la condición sea verdadera',
                example: `while not sprite.tocando("meta"):
    sprite.mover(5)`,
                params: [
                    { name: 'condicion', type: 'booleano', desc: 'Condición de parada' }
                ]
            },
            {
                name: 'Crear clon',
                python: 'crear_clon("sprite")',
                description: 'Crea una copia del sprite',
                example: `crear_clon("mi_mismo")  # Clonar este sprite
crear_clon("enemigo")   # Clonar otro sprite`,
                params: [
                    { name: 'sprite', type: 'texto', desc: 'Nombre del sprite a clonar' }
                ]
            },
            {
                name: 'Borrar clon',
                python: 'borrar_este_clon()',
                description: 'Elimina este clon',
                example: `if sprite.y < -180:
    borrar_este_clon()`,
                params: []
            },
            {
                name: 'Detener todo',
                python: 'detener_todo()',
                description: 'Detiene todos los scripts',
                example: `if vidas <= 0:
    detener_todo()`,
                params: []
            }
        ]
    },
    sensores: {
        name: 'Sensores',
        icon: '👁️',
        color: '#5CB1D6',
        description: 'Bloques para detectar eventos y condiciones',
        blocks: [
            {
                name: 'Tocando sprite',
                python: 'sprite.tocando("nombre")',
                description: 'Detecta si toca otro sprite',
                example: `if sprite.tocando("enemigo"):
    sprite.decir("¡Colisión!")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del sprite' }
                ]
            },
            {
                name: 'Tocando borde',
                python: 'sprite.tocando("_edge_")',
                description: 'Detecta si toca el borde del escenario',
                example: `if sprite.tocando("_edge_"):
    sprite.girar_derecha(180)`,
                params: []
            },
            {
                name: 'Tocando ratón',
                python: 'sprite.tocando("_mouse_")',
                description: 'Detecta si toca el puntero del ratón',
                example: `if sprite.tocando("_mouse_"):
    sprite.fijar_tamaño(120)`,
                params: []
            },
            {
                name: 'Distancia a',
                python: 'sprite.distancia_a("objetivo")',
                description: 'Mide la distancia a otro sprite',
                example: `if sprite.distancia_a("meta") < 50:
    sprite.decir("¡Cerca!")`,
                params: [
                    { name: 'objetivo', type: 'texto', desc: 'Sprite o _mouse_' }
                ]
            },
            {
                name: 'Preguntar y esperar',
                python: 'preguntar("pregunta")',
                description: 'Muestra un cuadro de entrada',
                example: `preguntar("¿Cómo te llamas?")
sprite.decir("Hola " + respuesta)`,
                params: [
                    { name: 'pregunta', type: 'texto', desc: 'Texto de la pregunta' }
                ]
            },
            {
                name: 'Respuesta',
                python: 'respuesta',
                description: 'Obtiene la última respuesta del usuario',
                example: `nombre = respuesta`,
                params: []
            },
            {
                name: 'Tecla presionada',
                python: 'tecla_presionada("tecla")',
                description: 'Detecta si una tecla está presionada',
                example: `if tecla_presionada("espacio"):
    sprite.saltar(10)`,
                params: [
                    { name: 'tecla', type: 'texto', desc: 'espacio, arriba, abajo, izquierda, derecha, letra' }
                ]
            },
            {
                name: 'Ratón presionado',
                python: 'raton.presionado',
                description: 'Detecta si el ratón está presionado',
                example: `if raton.presionado:
    sprite.ir_a_xy(raton.x, raton.y)`,
                params: []
            },
            {
                name: 'Posición X del ratón',
                python: 'raton.x',
                description: 'Obtiene la posición X del ratón',
                example: `sprite.fijar_x(raton.x)`,
                params: []
            },
            {
                name: 'Posición Y del ratón',
                python: 'raton.y',
                description: 'Obtiene la posición Y del ratón',
                example: `sprite.fijar_y(raton.y)`,
                params: []
            },
            {
                name: 'Cronómetro',
                python: 'cronometro',
                description: 'Obtiene el tiempo transcurrido',
                example: `if cronometro > 60:
    sprite.decir("¡Tiempo!")`,
                params: []
            },
            {
                name: 'Reiniciar cronómetro',
                python: 'reiniciar_cronometro()',
                description: 'Reinicia el cronómetro a 0',
                example: `reiniciar_cronometro()`,
                params: []
            }
        ]
    },
    operadores: {
        name: 'Operadores',
        icon: '🔢',
        color: '#59C059',
        description: 'Bloques matemáticos y lógicos',
        blocks: [
            {
                name: 'Suma',
                python: 'a + b',
                description: 'Suma dos números',
                example: `resultado = 5 + 3  # 8`,
                params: []
            },
            {
                name: 'Resta',
                python: 'a - b',
                description: 'Resta dos números',
                example: `resultado = 10 - 4  # 6`,
                params: []
            },
            {
                name: 'Multiplicación',
                python: 'a * b',
                description: 'Multiplica dos números',
                example: `resultado = 6 * 7  # 42`,
                params: []
            },
            {
                name: 'División',
                python: 'a / b',
                description: 'Divide dos números',
                example: `resultado = 20 / 4  # 5`,
                params: []
            },
            {
                name: 'Número aleatorio',
                python: 'aleatorio(min, max)',
                description: 'Genera un número aleatorio',
                example: `dado = aleatorio(1, 6)
sprite.ir_a_xy(aleatorio(-200, 200), 0)`,
                params: [
                    { name: 'min', type: 'número', desc: 'Valor mínimo' },
                    { name: 'max', type: 'número', desc: 'Valor máximo' }
                ]
            },
            {
                name: 'Mayor que',
                python: 'a > b',
                description: 'Compara si a es mayor que b',
                example: `if puntos > 100:
    sprite.decir("¡Nuevo récord!")`,
                params: []
            },
            {
                name: 'Menor que',
                python: 'a < b',
                description: 'Compara si a es menor que b',
                example: `if vidas < 1:
    detener_todo()`,
                params: []
            },
            {
                name: 'Igual a',
                python: 'a == b',
                description: 'Compara si dos valores son iguales',
                example: `if respuesta == "sí":
    sprite.decir("¡Genial!")`,
                params: []
            },
            {
                name: 'Y (and)',
                python: 'a and b',
                description: 'Verdadero si ambas condiciones son verdaderas',
                example: `if tecla_presionada("espacio") and sprite.en_suelo():
    sprite.saltar(15)`,
                params: []
            },
            {
                name: 'O (or)',
                python: 'a or b',
                description: 'Verdadero si al menos una condición es verdadera',
                example: `if sprite.x > 200 or sprite.x < -200:
    sprite.girar_derecha(180)`,
                params: []
            },
            {
                name: 'No (not)',
                python: 'not a',
                description: 'Invierte el valor de verdad',
                example: `if not sprite.tocando("suelo"):
    sprite.cambiar_y(-5)`,
                params: []
            },
            {
                name: 'Módulo',
                python: 'a % b',
                description: 'Resto de la división',
                example: `if contador % 2 == 0:
    sprite.decir("Par")`,
                params: []
            },
            {
                name: 'Redondear',
                python: 'redondear(num)',
                description: 'Redondea al entero más cercano',
                example: `entero = redondear(3.7)  # 4`,
                params: [
                    { name: 'num', type: 'número', desc: 'Número a redondear' }
                ]
            },
            {
                name: 'Valor absoluto',
                python: 'abs(num)',
                description: 'Devuelve el valor absoluto',
                example: `distancia = abs(sprite.x)`,
                params: [
                    { name: 'num', type: 'número', desc: 'Número' }
                ]
            }
        ]
    },
    variables: {
        name: 'Variables',
        icon: '📦',
        color: '#FF8C1A',
        description: 'Bloques para almacenar y manipular datos',
        blocks: [
            {
                name: 'Crear variable',
                python: 'variable = valor',
                description: 'Crea o asigna un valor a una variable',
                example: `puntos = 0
nombre = "Jugador"
vivo = True`,
                params: []
            },
            {
                name: 'Cambiar variable',
                python: 'variable += cantidad',
                description: 'Suma a la variable',
                example: `puntos += 10
vidas -= 1`,
                params: []
            },
            {
                name: 'Mostrar variable',
                python: 'mostrar_variable("nombre")',
                description: 'Muestra la variable en el escenario',
                example: `mostrar_variable("puntos")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre de la variable' }
                ]
            },
            {
                name: 'Ocultar variable',
                python: 'ocultar_variable("nombre")',
                description: 'Oculta la variable del escenario',
                example: `ocultar_variable("puntos")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre de la variable' }
                ]
            }
        ]
    },
    listas: {
        name: 'Listas',
        icon: '📋',
        color: '#FF661A',
        description: 'Bloques para trabajar con listas de datos',
        blocks: [
            {
                name: 'Crear lista',
                python: 'lista = []',
                description: 'Crea una lista vacía',
                example: `inventario = []
enemigos = ["fantasma", "zombie", "esqueleto"]`,
                params: []
            },
            {
                name: 'Agregar a lista',
                python: 'lista.agregar(elemento)',
                description: 'Agrega un elemento al final',
                example: `inventario.agregar("espada")
inventario.agregar("poción")`,
                params: [
                    { name: 'elemento', type: 'cualquiera', desc: 'Elemento a agregar' }
                ]
            },
            {
                name: 'Eliminar de lista',
                python: 'lista.eliminar(indice)',
                description: 'Elimina el elemento en el índice',
                example: `inventario.eliminar(1)  # Elimina el primero`,
                params: [
                    { name: 'indice', type: 'número', desc: 'Posición (empieza en 1)' }
                ]
            },
            {
                name: 'Limpiar lista',
                python: 'lista.limpiar()',
                description: 'Elimina todos los elementos',
                example: `inventario.limpiar()`,
                params: []
            },
            {
                name: 'Obtener elemento',
                python: 'lista[indice]',
                description: 'Obtiene un elemento por índice',
                example: `primero = inventario[1]
ultimo = inventario[len(inventario)]`,
                params: [
                    { name: 'indice', type: 'número', desc: 'Posición (empieza en 1)' }
                ]
            },
            {
                name: 'Longitud de lista',
                python: 'len(lista)',
                description: 'Obtiene el número de elementos',
                example: `cantidad = len(inventario)`,
                params: [
                    { name: 'lista', type: 'lista', desc: 'La lista' }
                ]
            },
            {
                name: 'Contiene elemento',
                python: 'elemento in lista',
                description: 'Verifica si la lista contiene un elemento',
                example: `if "espada" in inventario:
    sprite.decir("¡Tienes espada!")`,
                params: []
            }
        ]
    },
    juego: {
        name: 'Juego',
        icon: '🎮',
        color: '#FF6680',
        description: 'Bloques especiales de STBlock para crear juegos',
        blocks: [
            {
                name: 'Saltar',
                python: 'sprite.saltar(fuerza)',
                description: 'Hace que el sprite salte',
                example: `if tecla_presionada("espacio") and sprite.en_suelo():
    sprite.saltar(15)`,
                params: [
                    { name: 'fuerza', type: 'número', desc: 'Fuerza del salto' }
                ]
            },
            {
                name: 'Fijar gravedad',
                python: 'fisica.fijar_gravedad(valor)',
                description: 'Establece la gravedad del juego',
                example: `fisica.fijar_gravedad(1)   # Gravedad normal
fisica.fijar_gravedad(0.5) # Gravedad lunar`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Fuerza de gravedad' }
                ]
            },
            {
                name: 'Aplicar gravedad',
                python: 'sprite.aplicar_gravedad()',
                description: 'Aplica la gravedad al sprite',
                example: `while True:
    sprite.aplicar_gravedad()`,
                params: []
            },
            {
                name: 'En suelo',
                python: 'sprite.en_suelo()',
                description: 'Verifica si el sprite está en el suelo',
                example: `if sprite.en_suelo():
    sprite.fijar_velocidad_y(0)`,
                params: []
            },
            {
                name: 'En aire',
                python: 'sprite.en_aire()',
                description: 'Verifica si el sprite está en el aire',
                example: `if sprite.en_aire():
    sprite.aplicar_gravedad()`,
                params: []
            },
            {
                name: 'Fijar velocidad',
                python: 'sprite.fijar_velocidad(vx, vy)',
                description: 'Establece la velocidad del sprite',
                example: `sprite.fijar_velocidad(5, 0)  # Mover derecha`,
                params: [
                    { name: 'vx', type: 'número', desc: 'Velocidad horizontal' },
                    { name: 'vy', type: 'número', desc: 'Velocidad vertical' }
                ]
            },
            {
                name: 'Fijar salud',
                python: 'sprite.fijar_salud(valor)',
                description: 'Establece la salud del sprite',
                example: `sprite.fijar_salud(100)`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Puntos de salud' }
                ]
            },
            {
                name: 'Cambiar salud',
                python: 'sprite.cambiar_salud(cantidad)',
                description: 'Aumenta o reduce la salud',
                example: `sprite.cambiar_salud(-10)  # Perder salud
sprite.cambiar_salud(25)   # Curar`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Cantidad a cambiar' }
                ]
            },
            {
                name: 'Salud',
                python: 'sprite.salud',
                description: 'Obtiene la salud actual',
                example: `if sprite.salud <= 0:
    sprite.decir("Game Over")`,
                params: []
            },
            {
                name: 'Recibir daño',
                python: 'sprite.recibir_daño(cantidad)',
                description: 'Reduce la salud del sprite',
                example: `if sprite.tocando("enemigo"):
    sprite.recibir_daño(10)`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Daño recibido' }
                ]
            },
            {
                name: 'Curar',
                python: 'sprite.curar(cantidad)',
                description: 'Aumenta la salud del sprite',
                example: `if sprite.tocando("corazon"):
    sprite.curar(25)`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Cantidad a curar' }
                ]
            },
            {
                name: 'Cámara seguir',
                python: 'camara.seguir(sprite)',
                description: 'La cámara sigue al sprite',
                example: `camara.seguir(sprite)`,
                params: []
            },
            {
                name: 'Sacudir cámara',
                python: 'camara.sacudir(intensidad, duracion)',
                description: 'Efecto de temblor en la cámara',
                example: `camara.sacudir(10, 0.5)`,
                params: [
                    { name: 'intensidad', type: 'número', desc: 'Fuerza del temblor' },
                    { name: 'duracion', type: 'número', desc: 'Duración en segundos' }
                ]
            },
            {
                name: 'Zoom cámara',
                python: 'camara.zoom(nivel)',
                description: 'Cambia el nivel de zoom',
                example: `camara.zoom(2)    # Acercar
camara.zoom(0.5)  # Alejar`,
                params: [
                    { name: 'nivel', type: 'número', desc: '1=normal, >1=acercar, <1=alejar' }
                ]
            },
            {
                name: 'Colisiona con',
                python: 'sprite.colisiona_con("objetivo")',
                description: 'Verifica colisión con otro sprite',
                example: `if sprite.colisiona_con("plataforma"):
    sprite.fijar_velocidad_y(0)`,
                params: [
                    { name: 'objetivo', type: 'texto', desc: 'Nombre del sprite' }
                ]
            }
        ]
    },
    mis_bloques: {
        name: 'Mis Bloques',
        icon: '🧩',
        color: '#FF6680',
        description: 'Crea tus propias funciones personalizadas',
        blocks: [
            {
                name: 'Crear bloque',
                python: 'def nombre_funcion():',
                description: 'Define una función personalizada',
                example: `def saludar():
    sprite.decir("¡Hola!")
    esperar(1)
    sprite.decir("")

# Usar la función:
saludar()`,
                params: []
            },
            {
                name: 'Función con parámetros',
                python: 'def nombre(param1, param2):',
                description: 'Función con valores de entrada',
                example: `def mover_a(destino_x, destino_y):
    sprite.deslizar_a_xy(destino_x, destino_y, 1)

# Usar la función:
mover_a(100, 50)
mover_a(-100, -50)`,
                params: []
            },
            {
                name: 'Función que retorna',
                python: 'def nombre(): return valor',
                description: 'Función que devuelve un valor',
                example: `def calcular_distancia():
    return sprite.distancia_a("meta")

if calcular_distancia() < 50:
    sprite.decir("¡Cerca de la meta!")`,
                params: []
            }
        ]
    },
    programacion: {
        name: 'Programacion',
        icon: '🧠',
        color: '#48BF53',
        description: 'Funciones logicas y matematicas avanzadas',
        blocks: [
            { name: 'Verdadero', python: 'True', description: 'Valor booleano verdadero', example: 'while True:\n    sprite.mover(10)', params: [] },
            { name: 'Falso', python: 'False', description: 'Valor booleano falso', example: 'activo = False', params: [] },
            { name: 'XOR', python: 'A != B', description: 'Verdadero si solo uno es verdadero', example: 'if (A != B):\n    sprite.decir("Uno es verdadero")', params: [{ name: 'A', type: 'booleano', desc: 'Primer valor' }, { name: 'B', type: 'booleano', desc: 'Segundo valor' }] },
            { name: 'Implica', python: '(not A) or B', description: 'Verdadero si A implica B', example: 'if (not A) or B:\n    sprite.decir("ok")', params: [{ name: 'A', type: 'booleano', desc: 'Condicion' }, { name: 'B', type: 'booleano', desc: 'Resultado' }] },
            { name: 'Igual estricto', python: 'type(A) == type(B) and A == B', description: 'Compara valor y tipo', example: 'if type(a) == type(b) and a == b:\n    sprite.decir("Identicos")', params: [{ name: 'A', type: 'cualquiera', desc: 'Primer valor' }, { name: 'B', type: 'cualquiera', desc: 'Segundo valor' }] },
            { name: 'Entre', python: 'min <= valor <= max', description: 'Verdadero si valor entre min y max', example: 'if 10 <= x <= 20:\n    sprite.decir("Entre 10 y 20")', params: [{ name: 'valor', type: 'numero', desc: 'Valor' }, { name: 'min', type: 'numero', desc: 'Minimo' }, { name: 'max', type: 'numero', desc: 'Maximo' }] },
            { name: 'Limitar (clamp)', python: 'limitado(valor, min, max)', description: 'Limita un valor entre min y max', example: 'x = limitado(x, 0, 100)', params: [{ name: 'valor', type: 'numero', desc: 'Valor' }, { name: 'min', type: 'numero', desc: 'Minimo' }, { name: 'max', type: 'numero', desc: 'Maximo' }] },
            { name: 'Mapear (map)', python: 'mapeado(valor, in_min, in_max, out_min, out_max)', description: 'Re-mapea de un rango a otro', example: 'x = mapeado(valor, 0, 10, 0, 100)', params: [{ name: 'valor', type: 'numero', desc: 'Valor' }, { name: 'in_min', type: 'numero', desc: 'Entrada min' }, { name: 'in_max', type: 'numero', desc: 'Entrada max' }, { name: 'out_min', type: 'numero', desc: 'Salida min' }, { name: 'out_max', type: 'numero', desc: 'Salida max' }] },
            { name: 'Distancia puntos', python: 'distancia_puntos(x1, y1, x2, y2)', description: 'Distancia entre dos puntos', example: 'd = distancia_puntos(0, 0, 100, 100)', params: [{ name: 'x1', type: 'numero', desc: 'X1' }, { name: 'y1', type: 'numero', desc: 'Y1' }, { name: 'x2', type: 'numero', desc: 'X2' }, { name: 'y2', type: 'numero', desc: 'Y2' }] },
            { name: 'Porcentaje', python: 'porcentaje(parte, total)', description: 'Calcula porcentaje', example: 'pct = porcentaje(25, 200)', params: [{ name: 'parte', type: 'numero', desc: 'Parte' }, { name: 'total', type: 'numero', desc: 'Total' }] },
            { name: 'Signo', python: 'signo(valor)', description: 'Signo de un numero (-1, 0, 1)', example: 's = signo(-5)', params: [{ name: 'valor', type: 'numero', desc: 'Numero' }] },
            { name: 'Redondear decimales', python: 'redondear_decimales(valor, decimales)', description: 'Redondea a N decimales', example: 'precio = redondear_decimales(19.567, 2)', params: [{ name: 'valor', type: 'numero', desc: 'Numero' }, { name: 'decimales', type: 'numero', desc: 'Decimales' }] },
            { name: 'Reemplazar texto', python: 'reemplazar_texto(texto, buscar, reemplazar)', description: 'Reemplaza ocurrencias en texto', example: 'texto = reemplazar_texto("Hola mundo", "mundo", "Python")', params: [{ name: 'texto', type: 'texto', desc: 'Texto' }, { name: 'buscar', type: 'texto', desc: 'Buscar' }, { name: 'reemplazar', type: 'texto', desc: 'Reemplazo' }] }
        ]
    },
    datos_avanzados: {
        name: 'Datos Avanzados',
        icon: '🗄️',
        color: '#FF8C1A',
        description: 'Operaciones con JSON y listas',
        blocks: [
            { name: 'Obtener de JSON', python: 'json_obtener(json, clave)', description: 'Obtiene valor de JSON por clave', example: 'nombre = json_obtener(datos, "nombre")', params: [{ name: 'json', type: 'cualquiera', desc: 'JSON' }, { name: 'clave', type: 'texto', desc: 'Clave' }] },
            { name: 'Poner en JSON', python: 'json_poner(json, clave, valor)', description: 'Establece valor en JSON', example: 'json_poner(jugador, "puntos", 100)', params: [{ name: 'json', type: 'cualquiera', desc: 'JSON' }, { name: 'clave', type: 'texto', desc: 'Clave' }, { name: 'valor', type: 'cualquiera', desc: 'Valor' }] },
            { name: 'JSON tiene clave', python: 'json_tiene(json, clave)', description: 'Verifica si JSON tiene clave', example: 'if json_tiene(datos, "nombre"):\n    sprite.decir("Tiene nombre")', params: [{ name: 'json', type: 'cualquiera', desc: 'JSON' }, { name: 'clave', type: 'texto', desc: 'Clave' }] },
            { name: 'JSON a texto', python: 'json_texto(valor)', description: 'Convierte valor a texto JSON', example: 'texto = json_texto({"a": 1})', params: [{ name: 'valor', type: 'cualquiera', desc: 'Valor' }] }
        ]
    },
    eventos_pro: {
        name: 'Eventos Pro',
        icon: '⚡',
        color: '#FFD500',
        description: 'Eventos avanzados y personalizados',
        blocks: [
            { name: 'Emitir evento', python: 'emitir_evento(nombre)', description: 'Dispara un evento personalizado', example: 'emitir_evento("nivel_completado")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre del evento' }] },
            { name: 'Emitir con datos', python: 'emitir_evento(nombre, datos)', description: 'Evento con datos', example: 'emitir_evento("enemigo_muerto", {"puntos": 100})', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }, { name: 'datos', type: 'cualquiera', desc: 'Datos' }] },
            { name: 'Dato de evento', python: 'dato_evento(nombre)', description: 'Obtiene dato de evento', example: 'puntos = dato_evento("enemigo_muerto")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] }
        ]
    },
    estados: {
        name: 'Estados',
        icon: '🔀',
        color: '#9966FF',
        description: 'Maquina de estados para el juego',
        blocks: [
            { name: 'Cambiar estado', python: 'estado.cambiar(nombre)', description: 'Cambia al estado', example: 'estado.cambiar("jugando")', params: [{ name: 'nombre', type: 'texto', desc: 'Nuevo estado' }] },
            { name: 'Estado actual', python: 'estado.actual', description: 'Nombre del estado actual', example: 'if estado.actual == "jugando":\n    sprite.aplicar_gravedad()', params: [] },
            { name: 'Estado anterior', python: 'estado.anterior', description: 'Nombre del estado anterior', example: 'if estado.anterior == "menu":\n    sprite.fijar_x(0)', params: [] },
            { name: 'Es estado', python: 'estado.es(nombre)', description: 'Verifica si es el estado', example: 'if estado.es("pausa"):\n    sprite.decir("Pausado")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Volver', python: 'estado.volver()', description: 'Vuelve al estado anterior', example: 'estado.volver()', params: [] },
            { name: 'Reiniciar', python: 'estado.reiniciar()', description: 'Reinicia al estado inicial', example: 'estado.reiniciar()', params: [] }
        ]
    },
    debug: {
        name: 'Debug',
        icon: '🐛',
        color: '#607D8B',
        description: 'Herramientas de depuracion',
        blocks: [
            { name: 'Imprimir', python: 'debug.imprimir(valor)', description: 'Imprime en consola', example: 'debug.imprimir("Puntos: " + str(puntos))', params: [{ name: 'valor', type: 'cualquiera', desc: 'Valor' }] },
            { name: 'Advertir', python: 'debug.advertir(valor)', description: 'Muestra advertencia', example: 'if vidas < 3:\n    debug.advertir("Pocas vidas")', params: [{ name: 'valor', type: 'cualquiera', desc: 'Mensaje' }] },
            { name: 'Error', python: 'debug.error(valor)', description: 'Muestra error', example: 'debug.error("Error en peligro()")', params: [{ name: 'valor', type: 'cualquiera', desc: 'Mensaje' }] },
            { name: 'Pausar si', python: 'debug.pausar_si(condicion)', description: 'Pausa si se cumple condicion', example: 'debug.pausar_si(sprite.x > 200)', params: [{ name: 'condicion', type: 'booleano', desc: 'Condicion' }] },
            { name: 'Marca', python: 'debug.marcar(nombre)', description: 'Marca un punto en el tiempo', example: 'debug.marcar("inicio")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Ms desde marca', python: 'debug.ms_desde(nombre)', description: 'Milisegundos desde marca', example: 'tiempo = debug.ms_desde("inicio")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Contar', python: 'debug.contar(nombre)', description: 'Incrementa contador', example: 'debug.contar("frames")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Contador', python: 'debug.contador(nombre)', description: 'Obtiene valor del contador', example: 'total = debug.contador("enemigos")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] }
        ]
    },
    pruebas: {
        name: 'Pruebas',
        icon: '🧪',
        color: '#FF6680',
        description: 'Sistema de pruebas unitarias',
        blocks: [
            { name: 'Afirmar verdadero', python: 'pruebas.afirmar_verdadero(condicion, nombre)', description: 'Verifica condicion verdadera', example: 'pruebas.afirmar_verdadero(salud > 0, "Jugador vivo")', params: [{ name: 'condicion', type: 'booleano', desc: 'Condicion' }, { name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Afirmar igual', python: 'pruebas.afirmar_igual(valor, esperado, nombre)', description: 'Verifica igualdad', example: 'pruebas.afirmar_igual(puntos, 100, "Puntos")', params: [{ name: 'valor', type: 'cualquiera', desc: 'Valor' }, { name: 'esperado', type: 'cualquiera', desc: 'Esperado' }, { name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Afirmar entre', python: 'pruebas.afirmar_entre(valor, min, max, nombre)', description: 'Verifica rango', example: 'pruebas.afirmar_entre(sprite.x, -240, 240, "X en pantalla")', params: [{ name: 'valor', type: 'numero', desc: 'Valor' }, { name: 'min', type: 'numero', desc: 'Min' }, { name: 'max', type: 'numero', desc: 'Max' }, { name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Reiniciar', python: 'pruebas.reiniciar()', description: 'Reinicia contadores', example: 'pruebas.reiniciar()', params: [] },
            { name: 'Pasadas', python: 'pruebas.pasadas', description: 'Pruebas pasadas', example: 'debug.imprimir("Pasadas: " + str(pruebas.pasadas))', params: [] },
            { name: 'Fallidas', python: 'pruebas.fallidas', description: 'Pruebas fallidas', example: 'if pruebas.fallidas > 0:\n    debug.error("Fallidas")', params: [] },
            { name: 'Total', python: 'pruebas.total', description: 'Total de pruebas', example: 'debug.imprimir("Total: " + str(pruebas.total))', params: [] },
            { name: 'Reporte', python: 'pruebas.reporte', description: 'Reporte completo', example: 'debug.imprimir(pruebas.reporte)', params: [] }
        ]
    },
    gravedad: {
        name: 'Gravedad',
        icon: '🌍',
        color: '#5B7CFA',
        description: 'Control de gravedad del juego',
        blocks: [
            { name: 'Fijar gravedad', python: 'fisica.fijar_gravedad(valor)', description: 'Establece la gravedad', example: 'fisica.fijar_gravedad(1)', params: [{ name: 'valor', type: 'numero', desc: 'Fuerza' }] },
            { name: 'Cambiar gravedad', python: 'fisica.cambiar_gravedad(valor)', description: 'Modifica la gravedad', example: 'fisica.cambiar_gravedad(0.5)', params: [{ name: 'valor', type: 'numero', desc: 'Cambio' }] },
            { name: 'Gravedad actual', python: 'fisica.gravedad', description: 'Gravedad actual', example: 'if fisica.gravedad > 2:\n    debug.imprimir("Alta")', params: [] },
            { name: 'Velocidad terminal', python: 'fisica.fijar_velocidad_terminal(valor)', description: 'Velocidad max de caida', example: 'fisica.fijar_velocidad_terminal(15)', params: [{ name: 'valor', type: 'numero', desc: 'Velocidad max' }] },
            { name: 'Suelo Y', python: 'fisica.fijar_suelo_y(y)', description: 'Posicion Y del suelo', example: 'fisica.fijar_suelo_y(-150)', params: [{ name: 'y', type: 'numero', desc: 'Posicion Y' }] }
        ]
    },
    fisicas: {
        name: 'Fisicas',
        icon: '⚙️',
        color: '#00A8A8',
        description: 'Fisica de movimiento de sprites',
        blocks: [
            { name: 'Saltar', python: 'sprite.saltar(fuerza)', description: 'Sprite salta', example: 'if tecla_presionada("espacio"):\n    sprite.saltar(15)', params: [{ name: 'fuerza', type: 'numero', desc: 'Fuerza' }] },
            { name: 'En suelo', python: 'sprite.en_suelo(tolerancia)', description: 'Esta en el suelo?', example: 'if sprite.en_suelo(5):\n    sprite.fijar_velocidad_y(0)', params: [{ name: 'tolerancia', type: 'numero', desc: 'Tolerancia' }] },
            { name: 'Fijar velocidad', python: 'sprite.fijar_velocidad(vx, vy)', description: 'Establece velocidad', example: 'sprite.fijar_velocidad(5, 0)', params: [{ name: 'vx', type: 'numero', desc: 'Velocidad X' }, { name: 'vy', type: 'numero', desc: 'Velocidad Y' }] },
            { name: 'Cambiar velocidad', python: 'sprite.cambiar_velocidad(vx, vy)', description: 'Modifica velocidad', example: 'sprite.cambiar_velocidad(1, 0)', params: [{ name: 'vx', type: 'numero', desc: 'VX' }, { name: 'vy', type: 'numero', desc: 'VY' }] },
            { name: 'Velocidad X', python: 'sprite.velocidad_x', description: 'Velocidad horizontal', example: 'if sprite.velocidad_x > 10:\n    debug.imprimir("Rapido")', params: [] },
            { name: 'Velocidad Y', python: 'sprite.velocidad_y', description: 'Velocidad vertical', example: 'v = sprite.velocidad_y', params: [] },
            { name: 'Aplicar velocidad', python: 'sprite.aplicar_velocidad()', description: 'Aplica velocidad a posicion', example: 'sprite.aplicar_velocidad()', params: [] },
            { name: 'Fijar friccion', python: 'sprite.fijar_friccion(valor)', description: 'Coeficiente de friccion', example: 'sprite.fijar_friccion(0.9)', params: [{ name: 'valor', type: 'numero', desc: 'Coeficiente' }] },
            { name: 'Aplicar fuerza', python: 'sprite.aplicar_fuerza(fuerza, direccion)', description: 'Aplica fuerza en direccion', example: 'sprite.aplicar_fuerza(10, 90)', params: [{ name: 'fuerza', type: 'numero', desc: 'Fuerza' }, { name: 'direccion', type: 'numero', desc: 'Direccion' }] },
            { name: 'Detener movimiento', python: 'sprite.detener_movimiento(eje)', description: 'Detiene movimiento en eje', example: 'sprite.detener_movimiento("todo")', params: [{ name: 'eje', type: 'texto', desc: '"todo","x","y"' }] },
            { name: 'Mantener en escenario', python: 'sprite.mantener_en_escenario()', description: 'Mantiene dentro del escenario', example: 'sprite.mantener_en_escenario()', params: [] },
            { name: 'Rapidez', python: 'sprite.rapidez', description: 'Magnitud de velocidad', example: 'if sprite.rapidez > 20:\n    debug.imprimir("Rapido")', params: [] },
            { name: 'Fijar masa', python: 'sprite.fijar_masa(valor)', description: 'Establece la masa', example: 'sprite.fijar_masa(2)', params: [{ name: 'valor', type: 'numero', desc: 'Masa' }] },
            { name: 'Reiniciar fisicas', python: 'sprite.reiniciar_fisicas()', description: 'Reinicia propiedades fisicas', example: 'sprite.reiniciar_fisicas()', params: [] }
        ]
    },
    camara: {
        name: 'Camara',
        icon: '📷',
        color: '#7B61FF',
        description: 'Control de camara para scrolling',
        blocks: [
            { name: 'Seguir sprite', python: 'camara.seguir(suavidad)', description: 'Sigue al sprite', example: 'camara.seguir(0.1)', params: [{ name: 'suavidad', type: 'numero', desc: 'Suavizado 0-1' }] },
            { name: 'Fijar posicion', python: 'camara.fijar_posicion(x, y)', description: 'Posicion de la camara', example: 'camara.fijar_posicion(500, 300)', params: [{ name: 'x', type: 'numero', desc: 'X' }, { name: 'y', type: 'numero', desc: 'Y' }] },
            { name: 'Sacudir', python: 'camara.sacudir(intensidad)', description: 'Efecto de temblor', example: 'camara.sacudir(10)', params: [{ name: 'intensidad', type: 'numero', desc: 'Intensidad' }] },
            { name: 'Seguir objetivo', python: 'camara.seguir_objetivo(objetivo, suavidad)', description: 'Sigue a un objetivo', example: 'camara.seguir_objetivo("enemigo", 0.05)', params: [{ name: 'objetivo', type: 'texto', desc: 'Nombre' }, { name: 'suavidad', type: 'numero', desc: 'Suavizado' }] },
            { name: 'Mover', python: 'camara.mover(x, y)', description: 'Desplaza la camara', example: 'camara.mover(10, 0)', params: [{ name: 'x', type: 'numero', desc: 'DX' }, { name: 'y', type: 'numero', desc: 'DY' }] },
            { name: 'Fijar zoom', python: 'camara.fijar_zoom(nivel)', description: 'Nivel de zoom', example: 'camara.fijar_zoom(2)', params: [{ name: 'nivel', type: 'numero', desc: 'Zoom' }] },
            { name: 'Cambiar zoom', python: 'camara.cambiar_zoom(cambio)', description: 'Modifica el zoom', example: 'camara.cambiar_zoom(0.1)', params: [{ name: 'cambio', type: 'numero', desc: 'Cambio' }] }
        ]
    },
    ia_enemigos: {
        name: 'IA Enemigos',
        icon: '🤖',
        color: '#2EBD59',
        description: 'IA para enemigos y NPCs',
        blocks: [
            { name: 'Mover a XY', python: 'ia.mover_a_xy(x, y, velocidad)', description: 'Mueve IA a posicion', example: 'ia.mover_a_xy(100, 0, 2)', params: [{ name: 'x', type: 'numero', desc: 'X' }, { name: 'y', type: 'numero', desc: 'Y' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Perseguir', python: 'ia.perseguir(objetivo, velocidad)', description: 'Persigue objetivo', example: 'ia.perseguir("jugador", 3)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Huir de', python: 'ia.huir_de(objetivo, velocidad)', description: 'Huye de objetivo', example: 'ia.huir_de("jugador", 2)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Mirar a', python: 'ia.mirar_a(objetivo)', description: 'Mira hacia objetivo', example: 'ia.mirar_a("jugador")', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }] },
            { name: 'Distancia a', python: 'ia.distancia_a(objetivo)', description: 'Distancia al objetivo', example: 'if ia.distancia_a("jugador") < 100:\n    ia.perseguir("jugador", 3)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }] },
            { name: 'En rango', python: 'ia.en_rango(objetivo, rango)', description: 'Objetivo en rango?', example: 'if ia.en_rango("jugador", 200):\n    ia.perseguir("jugador", 3)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'rango', type: 'numero', desc: 'Rango' }] },
            { name: 'Patrullar X', python: 'ia.patrullar_x(x1, x2, velocidad)', description: 'Patrulla entre puntos', example: 'ia.patrullar_x(-100, 100, 1)', params: [{ name: 'x1', type: 'numero', desc: 'X1' }, { name: 'x2', type: 'numero', desc: 'X2' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Deambular', python: 'ia.deambular(velocidad)', description: 'Se mueve aleatoriamente', example: 'ia.deambular(1)', params: [{ name: 'velocidad', type: 'numero', desc: 'Velocidad' }] }
        ]
    },
    combate: {
        name: 'Combate',
        icon: '⚔️',
        color: '#E04444',
        description: 'Sistema de combate y salud',
        blocks: [
            { name: 'Fijar salud', python: 'sprite.fijar_salud(valor)', description: 'Establece salud', example: 'sprite.fijar_salud(100)', params: [{ name: 'valor', type: 'numero', desc: 'Salud' }] },
            { name: 'Cambiar salud', python: 'sprite.cambiar_salud(cantidad)', description: 'Modifica salud', example: 'sprite.cambiar_salud(-10)', params: [{ name: 'cantidad', type: 'numero', desc: 'Cambio' }] },
            { name: 'Salud', python: 'sprite.salud', description: 'Salud actual', example: 'if sprite.salud <= 0:\n    sprite.decir("Game Over")', params: [] },
            { name: 'Salud maxima', python: 'sprite.fijar_salud_maxima(valor)', description: 'Salud maxima', example: 'sprite.fijar_salud_maxima(200)', params: [{ name: 'valor', type: 'numero', desc: 'Maximo' }] },
            { name: 'Danar', python: 'sprite.recibir_dano(cantidad)', description: 'Recibe dano', example: 'if sprite.tocando("enemigo"):\n    sprite.recibir_dano(10)', params: [{ name: 'cantidad', type: 'numero', desc: 'Dano' }] },
            { name: 'Curar', python: 'sprite.curar(cantidad)', description: 'Cura al sprite', example: 'sprite.curar(25)', params: [{ name: 'cantidad', type: 'numero', desc: 'Curacion' }] },
            { name: 'Esta vivo', python: 'sprite.esta_vivo()', description: 'Esta vivo?', example: 'if sprite.esta_vivo():\n    sprite.decir("Vivo")', params: [] },
            { name: 'Atacar si toca', python: 'sprite.atacar_si_toca(objetivo)', description: 'Ataca si toca objetivo', example: 'sprite.atacar_si_toca("enemigo")', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }] },
            { name: 'Hacer invencible', python: 'sprite.hacer_invencible(segundos)', description: 'Invencible por N seg', example: 'sprite.hacer_invencible(2)', params: [{ name: 'segundos', type: 'numero', desc: 'Segundos' }] },
            { name: 'Colisiona con', python: 'sprite.colisiona_con(objetivo)', description: 'Colisiona con objetivo?', example: 'if sprite.colisiona_con("plataforma"):\n    sprite.fijar_velocidad_y(0)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }] }
        ]
    }
};

export const CATEGORIES = Object.keys(PYTHON_REFERENCE);
