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
            },
            {
                name: 'Enviar mensaje y esperar',
                python: 'enviar_mensaje_y_esperar("nombre")',
                description: 'Envía un mensaje y espera a que todos terminen',
                example: `enviar_mensaje_y_esperar("animacion")
sprite.decir("¡La animación terminó!")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del mensaje a enviar' }
                ]
            },
            {
                name: 'Al cambiar fondo',
                python: '@cuando_fondo_cambia_a("fondo")\ndef al_cambiar_fondo():',
                description: 'Ejecuta el código cuando el fondo cambia a uno específico',
                example: `@cuando_fondo_cambia_a("noche")
def al_cambiar_fondo():
    sprite.decir("Se hizo de noche")
    sprite.esconder()`,
                params: [
                    { name: 'fondo', type: 'texto', desc: 'Nombre del fondo que dispara el evento' }
                ]
            },
            {
                name: 'Cuando mayor que',
                python: '@cuando_mayor_que("timer", valor)\ndef al_superar_valor():',
                description: 'Ejecuta el código cuando un valor supera el número indicado',
                example: `@cuando_mayor_que("timer", 10)
def al_superar_valor():
    sprite.decir("¡Se acabó el tiempo!")`,
                params: [
                    { name: 'medida', type: 'texto', desc: '"timer" (cronómetro)' },
                    { name: 'valor', type: 'número', desc: 'Valor a superar' }
                ]
            },
            {
                name: 'Al comenzar como clon',
                python: '@cuando_comience_como_clon\ndef al_clonar():',
                description: 'Ejecuta el código cuando este sprite se clona',
                example: `crear_clon("mi_mismo")
@cuando_comience_como_clon
def al_clonar():
    sprite.decir("¡Soy un clon!")
    esperar(2)
    borrar_este_clon()`,
                params: []
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
            },
            {
                name: 'Ir a',
                python: 'sprite.ir_a("_mouse_")',
                description: 'Va a la posición de un objeto (ratón u otro sprite)',
                example: `sprite.ir_a("_mouse_")   # Ir donde está el ratón
sprite.ir_a("enemigo")    # Ir a la posición de otro sprite
sprite.ir_a("_random_")   # Posición aleatoria`,
                params: [
                    { name: 'destino', type: 'texto', desc: '"_mouse_", "_random_" o nombre de otro sprite' }
                ]
            },
            {
                name: 'Deslizar a',
                python: 'sprite.deslizar_a("_mouse_", segundos)',
                description: 'Se desliza suavemente hasta un objeto en un tiempo',
                example: `sprite.deslizar_a("_mouse_", 1)   # Desliza al ratón en 1s
sprite.deslizar_a("enemigo", 2)  # Desliza a otro sprite`,
                params: [
                    { name: 'destino', type: 'texto', desc: '"_mouse_", "_random_" o nombre de otro sprite' },
                    { name: 'segundos', type: 'número', desc: 'Duración del deslizamiento' }
                ]
            },
            {
                name: 'Apuntar hacia',
                python: 'sprite.apuntar_hacia("_mouse_")',
                description: 'Gira el sprite para apuntar hacia un objeto',
                example: `sprite.apuntar_hacia("_mouse_")
sprite.apuntar_hacia("enemigo")`,
                params: [
                    { name: 'objetivo', type: 'texto', desc: '"_mouse_" o nombre de otro sprite' }
                ]
            },
            {
                name: 'Fijar estilo de rotación',
                python: 'sprite.fijar_estilo_rotacion("360")',
                description: 'Controla cómo rota el sprite',
                example: `sprite.fijar_estilo_rotacion("360")       # Rota libremente
sprite.fijar_estilo_rotacion("left-right")  # Solo izquierda/derecha
sprite.fijar_estilo_rotacion("none")        # No rota`,
                params: [
                    { name: 'estilo', type: 'texto', desc: '"360", "left-right" o "none"' }
                ]
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
            },
            {
                name: 'Pensar por segundos',
                python: 'sprite.pensar("mensaje", segundos)',
                description: 'Muestra un bocadillo de pensamiento por un tiempo',
                example: `sprite.pensar("¿Qué hacer...?", 2)`,
                params: [
                    { name: 'mensaje', type: 'texto', desc: 'Texto del pensamiento' },
                    { name: 'segundos', type: 'número', desc: 'Duración' }
                ]
            },
            {
                name: 'Cambiar efecto',
                python: 'sprite.cambiar_efecto("color", valor)',
                description: 'Cambia un efecto gráfico del sprite',
                example: `sprite.cambiar_efecto("color", 25)   # Cambia el color
sprite.cambiar_efecto("ghost", 50)    # Hace más transparente
sprite.cambiar_efecto("brightness", -20)`,
                params: [
                    { name: 'efecto', type: 'texto', desc: '"color", "ghost", "brightness", "saturation" o "fisheye"' },
                    { name: 'valor', type: 'número', desc: 'Cantidad a cambiar' }
                ]
            },
            {
                name: 'Fijar efecto',
                python: 'sprite.fijar_efecto("ghost", valor)',
                description: 'Establece el valor de un efecto gráfico',
                example: `sprite.fijar_efecto("ghost", 100)   # Totalmente invisible
sprite.fijar_efecto("color", 0)     # Color normal`,
                params: [
                    { name: 'efecto', type: 'texto', desc: '"color", "ghost", "brightness", "saturation" o "fisheye"' },
                    { name: 'valor', type: 'número', desc: 'Valor del efecto (0-100)' }
                ]
            },
            {
                name: 'Ir a capa',
                python: 'sprite.ir_a_capa("front")',
                description: 'Lleva el sprite al frente o al fondo',
                example: `sprite.ir_a_capa("front")   # Al frente
sprite.ir_a_capa("back")    # Al fondo`,
                params: [
                    { name: 'capa', type: 'texto', desc: '"front" o "back"' }
                ]
            },
            {
                name: 'Cambiar capa',
                python: 'sprite.cambiar_capa("backward", capas)',
                description: 'Mueve el sprite hacia delante o atrás N capas',
                example: `sprite.cambiar_capa("forward", 1)  # Una capa al frente
sprite.cambiar_capa("backward", 2) # Dos capas al fondo`,
                params: [
                    { name: 'direccion', type: 'texto', desc: '"forward" o "backward"' },
                    { name: 'capas', type: 'número', desc: 'Número de capas a mover' }
                ]
            }
        ]
    },
    escenario: {
        name: 'Escenario',
        icon: '🖼️',
        color: '#0BBD8C',
        description: 'Bloques para cambiar el fondo y conocer el escenario',
        blocks: [
            {
                name: 'Cambiar fondo',
                python: 'escenario.cambiar_fondo("nombre")',
                description: 'Cambia el fondo del escenario al que indiques',
                example: `escenario.cambiar_fondo("fondo1")
escenario.cambiar_fondo("espacio")
escenario.cambiar_fondo("cueva")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del fondo a mostrar' }
                ]
            },
            {
                name: 'Siguiente fondo',
                python: 'escenario.siguiente_fondo()',
                description: 'Cambia al siguiente fondo de la lista',
                example: `for _ in range(10):
    escenario.siguiente_fondo()
    esperar(0.5)`,
                params: []
            },
            {
                name: 'Nombre del fondo',
                python: 'escenario.fondo_nombre',
                description: 'Obtiene el nombre del fondo actual',
                example: `if escenario.fondo_nombre == "fondo1":
    sprite.decir("Estamos en el primer fondo")`,
                params: []
            },
            {
                name: 'Número del fondo',
                python: 'escenario.fondo_numero',
                description: 'Obtiene el número del fondo actual',
                example: `numero = escenario.fondo_numero`,
                params: []
            },
            {
                name: 'Ancho del escenario',
                python: 'escenario.ancho',
                description: 'Obtiene el ancho del escenario en pasos',
                example: `mitad = escenario.ancho / 2`,
                params: []
            },
            {
                name: 'Alto del escenario',
                python: 'escenario.alto',
                description: 'Obtiene el alto del escenario en pasos',
                example: `centro_y = escenario.alto / 2`,
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
            },
            {
                name: 'Cambiar efecto de sonido',
                python: 'sonido.cambiar_efecto("pitch", valor)',
                description: 'Cambia un efecto del sonido (tono o balance)',
                example: `sonido.cambiar_efecto("pitch", 20)   # Sube el tono
sonido.cambiar_efecto("pan", -50)     # Suena más a la izquierda`,
                params: [
                    { name: 'efecto', type: 'texto', desc: '"pitch" o "pan"' },
                    { name: 'valor', type: 'número', desc: 'Cantidad a cambiar' }
                ]
            },
            {
                name: 'Fijar efecto de sonido',
                python: 'sonido.fijar_efecto("pan", valor)',
                description: 'Establece el valor de un efecto de sonido',
                example: `sonido.fijar_efecto("pitch", 0)   # Tono normal
sonido.fijar_efecto("pan", 100)  # Suena a la derecha`,
                params: [
                    { name: 'efecto', type: 'texto', desc: '"pitch" o "pan"' },
                    { name: 'valor', type: 'número', desc: 'Valor del efecto' }
                ]
            },
            {
                name: 'Quitar efectos de sonido',
                python: 'sonido.quitar_efectos()',
                description: 'Elimina todos los efectos de sonido',
                example: `sonido.quitar_efectos()`,
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
            },
            {
                name: 'Tocando color',
                python: 'sprite.tocando_color("#ff0000")',
                description: 'Detecta si el sprite toca un color específico',
                example: `if sprite.tocando_color("#ff0000"):
    sprite.decir("¡Estoy tocando algo rojo!")`,
                params: [
                    { name: 'color', type: 'texto', desc: 'Color en formato #RRGGBB' }
                ]
            },
            {
                name: 'Color tocando color',
                python: 'sprite.color_tocando_color("#fff", "#000")',
                description: 'Detecta si un color del sprite toca otro color',
                example: `if sprite.color_tocando_color("#000000", "#ff0000"):
    sprite.decir("El negro toca el rojo")`,
                params: [
                    { name: 'color1', type: 'texto', desc: 'Color del sprite' },
                    { name: 'color2', type: 'texto', desc: 'Color a detectar' }
                ]
            },
            {
                name: 'Fijar modo arrastre',
                python: 'sprite.fijar_modo_arrastre("arrastrable")',
                description: 'Permite o impide arrastrar el sprite con el ratón',
                example: `sprite.fijar_modo_arrastre("arrastrable")
sprite.fijar_modo_arrastre("no arrastrable")`,
                params: [
                    { name: 'modo', type: 'texto', desc: '"arrastrable" o "no arrastrable"' }
                ]
            },
            {
                name: 'Obtener de',
                python: 'obtener_de("x position", "enemigo")',
                description: 'Obtiene una propiedad de otro sprite o del escenario',
                example: `x_enemigo = obtener_de("x position", "enemigo")
vida_enemigo = obtener_de("health", "enemigo")
nombre_fondo = obtener_de("backdrop name", "_stage_")`,
                params: [
                    { name: 'propiedad', type: 'texto', desc: '"x position", "y position", "direction", "size", "health" o "costume name"' },
                    { name: 'objeto', type: 'texto', desc: 'Nombre del sprite o "_stage_"' }
                ]
            },
            {
                name: 'Fecha actual',
                python: 'fecha_actual("hour")',
                description: 'Obtiene la hora, fecha o año actual',
                example: `hora = fecha_actual("hour")
minuto = fecha_actual("minute")
anio = fecha_actual("year")`,
                params: [
                    { name: 'parte', type: 'texto', desc: '"year", "month", "date", "day of week", "hour", "minute" o "second"' }
                ]
            },
            {
                name: 'Velocidad del ratón',
                python: 'raton.velocidad',
                description: 'Obtiene la velocidad de movimiento del ratón',
                example: `if raton.velocidad > 50:
    sprite.decir("¡Raton muy rapido!")`,
                params: []
            },
            {
                name: 'Posición X anterior del ratón',
                python: 'raton.x_anterior',
                description: 'Obtiene la posición X del ratón en el frame anterior',
                example: `dx = raton.x - raton.x_anterior`,
                params: []
            },
            {
                name: 'Posición Y anterior del ratón',
                python: 'raton.y_anterior',
                description: 'Obtiene la posición Y del ratón en el frame anterior',
                example: `dy = raton.y - raton.y_anterior`,
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
            },
            {
                name: 'Unir',
                python: 'unir("texto1", "texto2")',
                description: 'Une dos textos en uno solo',
                example: `mensaje = unir("Hola ", "mundo")  # "Hola mundo"
nombre_completo = unir(nombre, apellido)
sprite.decir(unir("Tienes ", str(puntos)) + " puntos")`,
                params: [
                    { name: 'texto1', type: 'texto', desc: 'Primer texto' },
                    { name: 'texto2', type: 'texto', desc: 'Segundo texto' }
                ]
            },
            {
                name: 'Letra de',
                python: 'letra_de(posicion, "texto")',
                description: 'Obtiene una letra de un texto por su posición',
                example: `primera = letra_de(1, "hola")   # "h"
segunda = letra_de(2, "hola")   # "o"`,
                params: [
                    { name: 'posicion', type: 'número', desc: 'Posición de la letra (empieza en 1)' },
                    { name: 'texto', type: 'texto', desc: 'Texto de donde extraer' }
                ]
            },
            {
                name: 'Longitud',
                python: 'longitud("texto")',
                description: 'Cuenta cuántos caracteres tiene un texto',
                example: `n = longitud("hola")  # 4
if longitud(respuesta) > 10:
    sprite.decir("Respuesta larga")`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto a medir' }
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
            },
            {
                name: 'Insertar en lista',
                python: 'lista.insertar(indice, elemento)',
                description: 'Inserta un elemento en una posición específica',
                example: `inventario.insertar(1, "escudo")  # Inserta al inicio
inventario.insertar(3, "poción")  # Inserta en la posición 3`,
                params: [
                    { name: 'indice', type: 'número', desc: 'Posición (empieza en 1)' },
                    { name: 'elemento', type: 'cualquiera', desc: 'Elemento a insertar' }
                ]
            },
            {
                name: 'Reemplazar elemento',
                python: 'lista[indice] = elemento',
                description: 'Sustituye el elemento de una posición',
                example: `inventario[1] = "espada mágica"
inventario[2] = "poción grande"`,
                params: [
                    { name: 'indice', type: 'número', desc: 'Posición (empieza en 1)' },
                    { name: 'elemento', type: 'cualquiera', desc: 'Nuevo elemento' }
                ]
            },
            {
                name: 'Índice de elemento',
                python: 'lista.indice_de(elemento)',
                description: 'Busca la posición de un elemento',
                example: `pos = inventario.indice_de("espada")
if pos > 0:
    sprite.decir("La espada está en: " + str(pos))`,
                params: [
                    { name: 'elemento', type: 'cualquiera', desc: 'Elemento a buscar' }
                ]
            },
            {
                name: 'Mostrar lista',
                python: 'mostrar_lista("nombre")',
                description: 'Muestra la lista en el escenario',
                example: `mostrar_lista("inventario")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre de la lista' }
                ]
            },
            {
                name: 'Ocultar lista',
                python: 'ocultar_lista("nombre")',
                description: 'Oculta la lista del escenario',
                example: `ocultar_lista("inventario")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre de la lista' }
                ]
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
            { name: 'Reemplazar texto', python: 'reemplazar_texto(texto, buscar, reemplazar)', description: 'Reemplaza ocurrencias en texto', example: 'texto = reemplazar_texto("Hola mundo", "mundo", "Python")', params: [{ name: 'texto', type: 'texto', desc: 'Texto' }, { name: 'buscar', type: 'texto', desc: 'Buscar' }, { name: 'reemplazar', type: 'texto', desc: 'Reemplazo' }] },
            { name: 'Interpolar', python: 'interpolar(a, b, t)', description: 'Interpola entre a y b con factor t (0-1)', example: 'pos = interpolar(0, 100, 0.5)  # 50', params: [{ name: 'a', type: 'numero', desc: 'Inicio' }, { name: 'b', type: 'numero', desc: 'Fin' }, { name: 't', type: 'numero', desc: 'Progreso 0-1' }] },
            { name: 'Angulo hacia', python: 'angulo_hacia(x1, y1, x2, y2)', description: 'Angulo entre dos puntos', example: 'a = angulo_hacia(0, 0, 10, 10)', params: [{ name: 'x1', type: 'numero', desc: 'X1' }, { name: 'y1', type: 'numero', desc: 'Y1' }, { name: 'x2', type: 'numero', desc: 'X2' }, { name: 'y2', type: 'numero', desc: 'Y2' }] },
            { name: 'Contador', python: 'conteo("nombre")', description: 'Cuenta las veces que se ejecuta', example: 'conteo("enemigos_muertos")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre del contador' }] },
            { name: 'Delta tiempo', python: 'delta_tiempo()', description: 'Tiempo transcurrido desde el frame anterior', example: 'mov = 5 * delta_tiempo() * 60', params: [] },
            { name: 'FPS', python: 'fps()', description: 'Fotogramas por segundo actuales', example: 'if fps() < 30:\n    debug.imprimir("Bajo rendimiento")', params: [] }
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
            { name: 'Dato de evento', python: 'dato_evento(nombre)', description: 'Obtiene dato de evento', example: 'puntos = dato_evento("enemigo_muerto")', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre' }] },
            { name: 'Cada frame', python: '@cada_frame\ndef cada_frame():', description: 'Se ejecuta en cada frame del juego', example: '@cada_frame\ndef cada_frame():\n    sprite.aplicar_gravedad()', params: [] },
            { name: 'Cada N segundos', python: '@cada_segundos(segundos)\ndef cada_segundo():', description: 'Se ejecuta cada cierto tiempo', example: '@cada_segundos(1)\ndef cada_segundo():\n    sprite.cambiar_salud(-1)', params: [{ name: 'segundos', type: 'numero', desc: 'Intervalo' }] },
            { name: 'Cuando evento', python: '@cuando_evento("nombre")\ndef al_recibir_evento():', description: 'Se ejecuta al recibir un evento personalizado', example: '@cuando_evento("nivel_inicio")\ndef al_recibir_evento():\n    sprite.mostrar()', params: [{ name: 'nombre', type: 'texto', desc: 'Nombre del evento' }] }
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
            { name: 'Suelo Y', python: 'fisica.fijar_suelo_y(y)', description: 'Posicion Y del suelo', example: 'fisica.fijar_suelo_y(-150)', params: [{ name: 'y', type: 'numero', desc: 'Posicion Y' }] },
            { name: 'Velocidad terminal actual', python: 'fisica.velocidad_terminal', description: 'Velocidad maxima de caida actual', example: 'if fisica.velocidad_terminal > 20:\n    debug.imprimir("Caida rapida")', params: [] },
            { name: 'Suelo Y actual', python: 'fisica.suelo_y', description: 'Posicion Y del suelo actual', example: 'if sprite.y < fisica.suelo_y:\n    sprite.fijar_y(fisica.suelo_y)', params: [] }
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
            { name: 'Reiniciar fisicas', python: 'sprite.reiniciar_fisicas()', description: 'Reinicia propiedades fisicas', example: 'sprite.reiniciar_fisicas()', params: [] },
            { name: 'Fijar velocidad X', python: 'sprite.fijar_velocidad_x(vx)', description: 'Velocidad horizontal exacta', example: 'sprite.fijar_velocidad_x(5)', params: [{ name: 'vx', type: 'numero', desc: 'Velocidad X' }] },
            { name: 'Fijar velocidad Y', python: 'sprite.fijar_velocidad_y(vy)', description: 'Velocidad vertical exacta', example: 'sprite.fijar_velocidad_y(-10)', params: [{ name: 'vy', type: 'numero', desc: 'Velocidad Y' }] },
            { name: 'Fijar aceleracion', python: 'sprite.fijar_aceleracion(ax, ay)', description: 'Aceleracion en X e Y', example: 'sprite.fijar_aceleracion(0, -0.5)  # Gravedad', params: [{ name: 'ax', type: 'numero', desc: 'Aceleracion X' }, { name: 'ay', type: 'numero', desc: 'Aceleracion Y' }] },
            { name: 'Fijar rebote', python: 'sprite.fijar_rebote(valor)', description: 'Coeficiente de rebote (0-1)', example: 'sprite.fijar_rebote(0.8)', params: [{ name: 'valor', type: 'numero', desc: 'Coeficiente' }] },
            { name: 'Control aire', python: 'sprite.fijar_control_aire(valor)', description: 'Control del sprite en el aire', example: 'sprite.fijar_control_aire(0.5)', params: [{ name: 'valor', type: 'numero', desc: 'Cantidad de control' }] },
            { name: 'Rebotar borde escenario', python: 'sprite.rebotar_en_borde_escenario()', description: 'Rebota al tocar el borde del escenario', example: 'sprite.rebotar_en_borde_escenario()', params: [] }
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
            { name: 'Cambiar zoom', python: 'camara.cambiar_zoom(cambio)', description: 'Modifica el zoom', example: 'camara.cambiar_zoom(0.1)', params: [{ name: 'cambio', type: 'numero', desc: 'Cambio' }] },
            { name: 'Posicion X camara', python: 'camara.x', description: 'Posicion X de la camara', example: 'if camara.x > 500:\n    camara.fijar_posicion(500, camara.y)', params: [] },
            { name: 'Posicion Y camara', python: 'camara.y', description: 'Posicion Y de la camara', example: 'y_cam = camara.y', params: [] },
            { name: 'Zoom camara', python: 'camara.zoom', description: 'Nivel de zoom actual', example: 'if camara.zoom > 3:\n    camara.fijar_zoom(1)', params: [] },
            { name: 'Mundo a pantalla X', python: 'camara.mundo_a_pantalla_x(x)', description: 'Convierte coord. mundo X a pantalla', example: 'sx = camara.mundo_a_pantalla_x(100)', params: [{ name: 'x', type: 'numero', desc: 'Coordenada mundo' }] },
            { name: 'Mundo a pantalla Y', python: 'camara.mundo_a_pantalla_y(y)', description: 'Convierte coord. mundo Y a pantalla', example: 'sy = camara.mundo_a_pantalla_y(200)', params: [{ name: 'y', type: 'numero', desc: 'Coordenada mundo' }] },
            { name: 'Pantalla a mundo X', python: 'camara.pantalla_a_mundo_x(x)', description: 'Convierte coord. pantalla X a mundo', example: 'mx = camara.pantalla_a_mundo_x(240)', params: [{ name: 'x', type: 'numero', desc: 'Coordenada pantalla' }] },
            { name: 'Pantalla a mundo Y', python: 'camara.pantalla_a_mundo_y(y)', description: 'Convierte coord. pantalla Y a mundo', example: 'my = camara.pantalla_a_mundo_y(180)', params: [{ name: 'y', type: 'numero', desc: 'Coordenada pantalla' }] },
            { name: 'Colocar en mundo', python: 'sprite.colocar_en_mundo(x, y)', description: 'Coloca el sprite en coordenadas del mundo', example: 'sprite.colocar_en_mundo(500, 300)', params: [{ name: 'x', type: 'numero', desc: 'X del mundo' }, { name: 'y', type: 'numero', desc: 'Y del mundo' }] }
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
            { name: 'Deambular', python: 'ia.deambular(velocidad)', description: 'Se mueve aleatoriamente', example: 'ia.deambular(1)', params: [{ name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Perseguir si rango', python: 'ia.perseguir_si_rango(objetivo, rango, velocidad)', description: 'Persigue solo si esta en rango', example: 'ia.perseguir_si_rango("jugador", 200, 3)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'rango', type: 'numero', desc: 'Rango' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Mantener distancia', python: 'ia.mantener_distancia(objetivo, min, max, velocidad)', description: 'Mantiene distancia del objetivo', example: 'ia.mantener_distancia("jugador", 50, 200, 1)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'min', type: 'numero', desc: 'Dist. minima' }, { name: 'max', type: 'numero', desc: 'Dist. maxima' }, { name: 'velocidad', type: 'numero', desc: 'Velocidad' }] },
            { name: 'Cerca de', python: 'ia.cerca_de(objetivo, distancia)', description: 'Esta cerca del objetivo?', example: 'if ia.cerca_de("jugador", 30):\n    sprite.atacar_si_toca("jugador")', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }, { name: 'distancia', type: 'numero', desc: 'Distancia' }] }
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
            { name: 'Colisiona con', python: 'sprite.colisiona_con(objetivo)', description: 'Colisiona con objetivo?', example: 'if sprite.colisiona_con("plataforma"):\n    sprite.fijar_velocidad_y(0)', params: [{ name: 'objetivo', type: 'texto', desc: 'Objetivo' }] },
            { name: 'Salud maxima', python: 'sprite.salud_maxima', description: 'Salud maxima actual', example: 'if sprite.salud >= sprite.salud_maxima:\n    sprite.decir("Salud completa")', params: [] },
            { name: 'Salud porcentaje', python: 'sprite.salud_porcentaje()', description: 'Salud como porcentaje', example: 'barra = sprite.salud_porcentaje()  # 0-100', params: [] },
            { name: 'Esta muerto', python: 'sprite.esta_muerto()', description: 'Esta muerto el sprite?', example: 'if sprite.esta_muerto():\n    detener_todo()', params: [] },
            { name: 'Fijar dano ataque', python: 'sprite.fijar_dano_ataque(valor)', description: 'Establece el dano del ataque', example: 'sprite.fijar_dano_ataque(25)', params: [{ name: 'valor', type: 'numero', desc: 'Dano' }] },
            { name: 'Danar objetivo', python: 'sprite.danar_objetivo(cantidad, objetivo)', description: 'Hace dano a otro sprite', example: 'if sprite.tocando("enemigo"):\n    sprite.danar_objetivo(10, "enemigo")', params: [{ name: 'cantidad', type: 'numero', desc: 'Dano' }, { name: 'objetivo', type: 'texto', desc: 'Objetivo' }] },
            { name: 'Es invencible', python: 'sprite.es_invencible', description: 'Es invencible?', example: 'if sprite.es_invencible:\n    sprite.decir("No me pueden golpear")', params: [] },
            { name: 'Retroceso desde', python: 'sprite.retroceso_desde(objetivo, fuerza)', description: 'Empuja al sprite lejos de un objetivo', example: 'if sprite.tocando("enemigo"):\n    sprite.retroceso_desde("enemigo", 15)', params: [{ name: 'objetivo', type: 'texto', desc: 'Origen del golpe' }, { name: 'fuerza', type: 'numero', desc: 'Fuerza del retroceso' }] },
            { name: 'Revivir', python: 'sprite.revivir(salud)', description: 'Revive al sprite con salud', example: 'if sprite.esta_muerto():\n    esperar(2)\n    sprite.revivir(100)', params: [{ name: 'salud', type: 'numero', desc: 'Salud al revivir' }] }
        ]
    },
    placa: {
        name: 'Placa',
        icon: '🔌',
        color: '#FF6B35',
        description: 'Controla la placa conectada (Arduino, STBoard V2 o micro:bit) desde Python',
        blocks: [
            {
                name: 'Al iniciar la placa',
                python: '@cuando_placa_inicie\ndef al_iniciar_placa():',
                description: 'Ejecuta el código cuando la placa se conecta e inicia',
                example: `@cuando_placa_inicie
def al_iniciar_placa():
    placa.modo(13, "salida")
    placa.escribir_digital(13, "alto")`,
                params: []
            }
        ]
    },
    placa_pines: {
        name: 'Pines',
        icon: '📟',
        color: '#FFAB19',
        description: 'Configura y usa los pines digitales y analógicos de la placa',
        blocks: [
            {
                name: 'Configurar modo de pin',
                python: 'placa.modo(pin, "salida")',
                description: 'Configura un pin como entrada, salida o entrada con resistencia pull-up',
                example: `placa.modo(13, "salida")          # Pin 13 como salida
placa.modo(2, "entrada")           # Pin 2 como entrada
placa.modo(2, "entrada_pullup")    # Entrada con pull-up`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Número del pin (ej. 13)' },
                    { name: 'modo', type: 'texto', desc: '"entrada", "salida" o "entrada_pullup" (también INPUT, OUTPUT, INPUT_PULLUP)' }
                ]
            },
            {
                name: 'Escribir salida digital',
                python: 'placa.escribir_digital(pin, "alto")',
                description: 'Pone un pin en nivel alto (5V) o bajo (0V)',
                example: `placa.escribir_digital(13, "alto")  # Enciende el LED
placa.escribir_digital(13, "bajo")   # Apaga el LED`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Número del pin' },
                    { name: 'nivel', type: 'texto', desc: '"alto" o "bajo" (también HIGH o LOW)' }
                ]
            },
            {
                name: 'Escribir analógico (PWM)',
                python: 'placa.escribir_analogico(pin, valor)',
                description: 'Escribe un valor PWM (0-255) para controlar brillo, motores, etc.',
                example: `placa.escribir_analogico(9, 128)  # 50% de brillo
placa.escribir_analogico(9, 255)  # Máximo`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin PWM (ej. 3, 5, 6, 9, 10, 11)' },
                    { name: 'valor', type: 'número', desc: 'Valor de 0 a 255' }
                ]
            },
            {
                name: 'Leer pin digital',
                python: 'placa.leer_digital(pin)',
                description: 'Lee un pin digital y devuelve 1 (alto) o 0 (bajo)',
                example: `if placa.leer_digital(2) == 1:
    placa.escribir_digital(13, "alto")`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Número del pin' }
                ]
            },
            {
                name: 'Leer pin analógico',
                python: 'placa.leer_analogico("A0")',
                description: 'Lee un pin analógico y devuelve un valor de 0 a 1023',
                example: `valor = placa.leer_analogico("A0")
if valor > 512:
    placa.escribir_digital(13, "alto")`,
                params: [
                    { name: 'pin', type: 'texto', desc: 'Pin analógico (ej. "A0", "A1")' }
                ]
            }
        ]
    },
    placa_servos: {
        name: 'Servos',
        icon: '🦾',
        color: '#FF8C1A',
        description: 'Controla servomotores conectados a la placa',
        blocks: [
            {
                name: 'Conectar servo',
                python: 'placa.conectar_servo(pin, min_us, max_us)',
                description: 'Prepara un pin para usar un servo (puedes ajustar el rango de pulso)',
                example: `placa.conectar_servo(9)              # Valores por defecto
placa.conectar_servo(9, 500, 2400)  # Rango estándar`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' },
                    { name: 'min_us', type: 'número', desc: 'Pulso mínimo en microsegundos (500)' },
                    { name: 'max_us', type: 'número', desc: 'Pulso máximo en microsegundos (2400)' }
                ]
            },
            {
                name: 'Escribir ángulo',
                python: 'placa.escribir_servo(pin, angulo)',
                description: 'Mueve el servo a un ángulo (0-180)',
                example: `placa.escribir_servo(9, 90)   # Posición central
placa.escribir_servo(9, 180)  # Giro máximo`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' },
                    { name: 'angulo', type: 'número', desc: 'Ángulo de 0 a 180' }
                ]
            },
            {
                name: 'Escribir pulso',
                python: 'placa.escribir_servo_pulso(pin, pulso)',
                description: 'Mueve el servo con un pulso en microsegundos (500-2400)',
                example: `placa.escribir_servo_pulso(9, 1500)  # Centro`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' },
                    { name: 'pulso', type: 'número', desc: 'Pulso en microsegundos' }
                ]
            },
            {
                name: 'Velocidad servo continuo',
                python: 'placa.velocidad_servo_continuo(pin, velocidad)',
                description: 'Controla la velocidad y sentido de un servo de rotación continua',
                example: `placa.velocidad_servo_continuo(9, 90)  # Gira en un sentido
placa.velocidad_servo_continuo(9, 0)   # Se detiene`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' },
                    { name: 'velocidad', type: 'número', desc: 'Velocidad de 0 a 180' }
                ]
            },
            {
                name: 'Centrar servo',
                python: 'placa.centrar_servo(pin)',
                description: 'Lleva el servo a su posición central (90°)',
                example: `placa.centrar_servo(9)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            },
            {
                name: 'Detener servo continuo',
                python: 'placa.detener_servo_continuo(pin)',
                description: 'Detiene un servo de rotación continua',
                example: `placa.detener_servo_continuo(9)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            },
            {
                name: 'Mover suave',
                python: 'placa.mover_servo_suave(pin, angulo, tiempo)',
                description: 'Mueve el servo suavemente a un ángulo en un tiempo dado',
                example: `placa.mover_servo_suave(9, 180, 2)  # En 2 segundos`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' },
                    { name: 'angulo', type: 'número', desc: 'Ángulo final' },
                    { name: 'tiempo', type: 'número', desc: 'Duración en segundos' }
                ]
            },
            {
                name: 'Desconectar servo',
                python: 'placa.desconectar_servo(pin)',
                description: 'Libera el pin del servo',
                example: `placa.desconectar_servo(9)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            },
            {
                name: 'Servo conectado',
                python: 'placa.servo_conectado(pin)',
                description: 'Devuelve True si hay un servo conectado en el pin',
                example: `if placa.servo_conectado(9):
    placa.escribir_servo(9, 45)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            },
            {
                name: 'Leer ángulo',
                python: 'placa.leer_angulo_servo(pin)',
                description: 'Devuelve el ángulo actual del servo',
                example: `angulo = placa.leer_angulo_servo(9)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            },
            {
                name: 'Leer pulso',
                python: 'placa.leer_pulso_servo(pin)',
                description: 'Devuelve el pulso actual del servo en microsegundos',
                example: `pulso = placa.leer_pulso_servo(9)`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin del servo' }
                ]
            }
        ]
    },
    placa_serial: {
        name: 'Serial',
        icon: '📡',
        color: '#5CB1D6',
        description: 'Comunicación por puerto serie para enviar y recibir datos',
        blocks: [
            {
                name: 'Iniciar serial',
                python: 'placa.serial_iniciar(baudaje)',
                description: 'Inicia la comunicación serial con una velocidad (baudios)',
                example: `placa.serial_iniciar(9600)`,
                params: [
                    { name: 'baudaje', type: 'número', desc: 'Velocidad en baudios (9600, 115200...)' }
                ]
            },
            {
                name: 'Enviar datos',
                python: 'placa.serial_enviar(datos, con_salto)',
                description: 'Envía datos por serial; por defecto añade salto de línea',
                example: `placa.serial_enviar("Hola")         # Con salto de línea
placa.serial_enviar("Hola", False)  # Sin salto de línea`,
                params: [
                    { name: 'datos', type: 'cualquiera', desc: 'Datos a enviar' },
                    { name: 'con_salto', type: 'booleano', desc: 'True añade salto de línea (por defecto)' }
                ]
            },
            {
                name: 'Enviar línea',
                python: 'placa.serial_enviar_linea(datos)',
                description: 'Envía datos con salto de línea al final',
                example: `placa.serial_enviar_linea(lectura)`,
                params: [
                    { name: 'datos', type: 'cualquiera', desc: 'Datos a enviar' }
                ]
            },
            {
                name: 'Datos disponibles',
                python: 'placa.serial_disponible()',
                description: 'Devuelve cuántos bytes hay disponibles para leer',
                example: `if placa.serial_disponible() > 0:
    dato = placa.serial_leer()`,
                params: []
            },
            {
                name: 'Leer byte',
                python: 'placa.serial_leer()',
                description: 'Lee un byte (0-255) del buffer serial',
                example: `dato = placa.serial_leer()`,
                params: []
            },
            {
                name: 'Leer hasta',
                python: 'placa.serial_leer_hasta(terminador)',
                description: 'Lee caracteres hasta encontrar el terminador',
                example: `mensaje = placa.serial_leer_hasta("\\n")`,
                params: [
                    { name: 'terminador', type: 'texto', desc: 'Carácter que detiene la lectura (ej. "\\n")' }
                ]
            },
            {
                name: 'Vaciar buffer',
                python: 'placa.serial_vaciar()',
                description: 'Limpia el buffer de datos seriales',
                example: `placa.serial_vaciar()`,
                params: []
            }
        ]
    },
    placa_puertos: {
        name: 'Puertos STB',
        icon: '🔧',
        color: '#9966FF',
        description: 'Servos conectados a los puertos de la STBoard V2',
        blocks: [
            {
                name: 'Mover servo de puerto',
                python: 'placa.mover_servo_puerto(puerto, angulo)',
                description: 'Mueve el servo del puerto al ángulo indicado',
                example: `placa.mover_servo_puerto(1, 90)`,
                params: [
                    { name: 'puerto', type: 'número', desc: 'Número del puerto (1-4)' },
                    { name: 'angulo', type: 'número', desc: 'Ángulo de 0 a 180' }
                ]
            },
            {
                name: 'Mover por pulsos',
                python: 'placa.mover_servo_puerto_pulsos(puerto, pulso)',
                description: 'Mueve el servo del puerto con un pulso en microsegundos',
                example: `placa.mover_servo_puerto_pulsos(1, 1500)`,
                params: [
                    { name: 'puerto', type: 'número', desc: 'Número del puerto' },
                    { name: 'pulso', type: 'número', desc: 'Pulso en microsegundos' }
                ]
            },
            {
                name: 'Desconectar servo de puerto',
                python: 'placa.desconectar_servo_puerto(puerto)',
                description: 'Libera el puerto',
                example: `placa.desconectar_servo_puerto(1)`,
                params: [
                    { name: 'puerto', type: 'número', desc: 'Número del puerto' }
                ]
            },
            {
                name: 'Mover suave',
                python: 'placa.mover_servo_puerto_suave(puerto, angulo, tiempo)',
                description: 'Mueve el servo del puerto suavemente en un tiempo',
                example: `placa.mover_servo_puerto_suave(1, 180, 2)`,
                params: [
                    { name: 'puerto', type: 'número', desc: 'Número del puerto' },
                    { name: 'angulo', type: 'número', desc: 'Ángulo final' },
                    { name: 'tiempo', type: 'número', desc: 'Duración en segundos' }
                ]
            }
        ]
    },
    placa_i2c_spi: {
        name: 'I2C / SPI',
        icon: '🔗',
        color: '#59C059',
        description: 'Comunicación con dispositivos I2C y SPI (la ejecución en vivo depende del periférico conectado)',
        blocks: [
            {
                name: 'Iniciar I2C',
                python: 'placa.i2c_iniciar()',
                description: 'Inicia el bus I2C',
                example: `placa.i2c_iniciar()`,
                params: []
            },
            {
                name: 'Velocidad I2C',
                python: 'placa.i2c_velocidad(velocidad)',
                description: 'Ajusta la velocidad del bus I2C',
                example: `placa.i2c_velocidad(100000)  # 100 kHz`,
                params: [
                    { name: 'velocidad', type: 'número', desc: 'Velocidad en Hz (100000 o 400000)' }
                ]
            },
            {
                name: 'Iniciar transmisión',
                python: 'placa.i2c_iniciar_transmision(direccion)',
                description: 'Comienza una transmisión hacia un dispositivo',
                example: `placa.i2c_iniciar_transmision(0x27)`,
                params: [
                    { name: 'direccion', type: 'número', desc: 'Dirección I2C del dispositivo (0x27, 0x3C...)' }
                ]
            },
            {
                name: 'Enviar byte',
                python: 'placa.i2c_enviar_byte(dato)',
                description: 'Envía un byte al dispositivo',
                example: `placa.i2c_enviar_byte(65)`,
                params: [
                    { name: 'dato', type: 'número', desc: 'Byte a enviar (0-255)' }
                ]
            },
            {
                name: 'Enviar texto',
                python: 'placa.i2c_enviar_texto(texto)',
                description: 'Envía una cadena de texto al dispositivo',
                example: `placa.i2c_enviar_texto("Hola")`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto a enviar' }
                ]
            },
            {
                name: 'Finalizar transmisión',
                python: 'placa.i2c_finalizar_transmision()',
                description: 'Termina la transmisión actual',
                example: `placa.i2c_finalizar_transmision()`,
                params: []
            },
            {
                name: 'Solicitar datos',
                python: 'placa.i2c_solicitar(cantidad, direccion)',
                description: 'Solicita una cantidad de bytes a un dispositivo',
                example: `placa.i2c_solicitar(6, 0x27)  # Pide 6 bytes al dispositivo`,
                params: [
                    { name: 'cantidad', type: 'número', desc: 'Número de bytes a solicitar' },
                    { name: 'direccion', type: 'número', desc: 'Dirección I2C del dispositivo' }
                ]
            },
            {
                name: 'Datos disponibles',
                python: 'placa.i2c_disponible()',
                description: 'Devuelve cuántos bytes hay disponibles para leer',
                example: `if placa.i2c_disponible() > 0:
    dato = placa.i2c_leer()`,
                params: []
            },
            {
                name: 'Leer byte',
                python: 'placa.i2c_leer()',
                description: 'Lee un byte del bus I2C',
                example: `dato = placa.i2c_leer()`,
                params: []
            },
            {
                name: 'Escanear bus',
                python: 'placa.i2c_escanear()',
                description: 'Busca los dispositivos conectados al bus I2C',
                example: `direcciones = placa.i2c_escanear()`,
                params: []
            },
            {
                name: 'Iniciar SPI',
                python: 'placa.spi_iniciar()',
                description: 'Inicia el bus SPI',
                example: `placa.spi_iniciar()`,
                params: []
            },
            {
                name: 'Configurar SPI',
                python: 'placa.spi_configurar(velocidad, orden, modo)',
                description: 'Configura velocidad, orden de bits y modo SPI',
                example: `placa.spi_configurar(4000000, "MSBFIRST", "SPI_MODE0")`,
                params: [
                    { name: 'velocidad', type: 'número', desc: 'Frecuencia en Hz' },
                    { name: 'orden', type: 'texto', desc: '"MSBFIRST" o "LSBFIRST"' },
                    { name: 'modo', type: 'texto', desc: '"SPI_MODE0", "SPI_MODE1", "SPI_MODE2" o "SPI_MODE3"' }
                ]
            },
            {
                name: 'Iniciar transacción',
                python: 'placa.spi_iniciar_transaccion(pin)',
                description: 'Inicia una transacción seleccionando el pin CS',
                example: `placa.spi_iniciar_transaccion(10)  # Pin CS 10`,
                params: [
                    { name: 'pin', type: 'número', desc: 'Pin de selección (CS)' }
                ]
            },
            {
                name: 'Transferir byte',
                python: 'placa.spi_transferir(dato)',
                description: 'Transfiere un byte y devuelve el byte recibido',
                example: `dato = placa.spi_transferir(0x55)`,
                params: [
                    { name: 'dato', type: 'número', desc: 'Byte a enviar (0-255)' }
                ]
            },
            {
                name: 'Transferir lista',
                python: 'placa.spi_transferir_lista(nombre, tamaño)',
                description: 'Transfiere los datos de un array por SPI',
                example: `placa.spi_transferir_lista("datos", 4)`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array declarado' },
                    { name: 'tamaño', type: 'número', desc: 'Cantidad de elementos a transferir' }
                ]
            },
            {
                name: 'Finalizar transacción',
                python: 'placa.spi_finalizar_transaccion()',
                description: 'Termina la transacción SPI actual',
                example: `placa.spi_finalizar_transaccion()`,
                params: []
            },
            {
                name: 'Finalizar SPI',
                python: 'placa.spi_finalizar()',
                description: 'Detiene el bus SPI',
                example: `placa.spi_finalizar()`,
                params: []
            }
        ]
    },
    placa_datos: {
        name: 'Datos',
        icon: '🧮',
        color: '#FF8C1A',
        description: 'Conversiones y operaciones con datos (igual que los bloques de Arduino)',
        blocks: [
            {
                name: 'Mapear',
                python: 'placa.mapear(valor, min_ent, max_ent, min_sal, max_sal)',
                description: 'Re-mapea un valor de un rango a otro (equivalente a map de Arduino)',
                example: `x = placa.mapear(50, 0, 100, 0, 255)  # 127.5`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Valor a convertir' },
                    { name: 'min_ent', type: 'número', desc: 'Mínimo del rango de entrada' },
                    { name: 'max_ent', type: 'número', desc: 'Máximo del rango de entrada' },
                    { name: 'min_sal', type: 'número', desc: 'Mínimo del rango de salida' },
                    { name: 'max_sal', type: 'número', desc: 'Máximo del rango de salida' }
                ]
            },
            {
                name: 'Limitar',
                python: 'placa.limitar(valor, minimo, maximo)',
                description: 'Limita un valor entre un mínimo y un máximo (clamp)',
                example: `x = placa.limitar(300, 0, 255)  # 255`,
                params: [
                    { name: 'valor', type: 'número', desc: 'Valor a limitar' },
                    { name: 'minimo', type: 'número', desc: 'Mínimo permitido' },
                    { name: 'maximo', type: 'número', desc: 'Máximo permitido' }
                ]
            },
            {
                name: 'Convertir',
                python: 'placa.convertir(tipo, valor)',
                description: 'Convierte un valor según el tipo (entero / decimal / texto)',
                example: `n = placa.convertir("entero", "42")   # 42
f = placa.convertir("decimal", 3)    # 3.0
t = placa.convertir("texto", 42)     # "42"`,
                params: [
                    { name: 'tipo', type: 'texto', desc: '"entero", "decimal" o "texto" (también INTEGER, DECIMAL, STRING)' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a convertir' }
                ]
            },
            {
                name: 'Carácter ASCII',
                python: 'placa.caracter_ascii(numero)',
                description: 'Devuelve el carácter ASCII correspondiente a un número',
                example: `letra = placa.caracter_ascii(65)  # "A"`,
                params: [
                    { name: 'numero', type: 'número', desc: 'Código ASCII (0-255)' }
                ]
            },
            {
                name: 'Número ASCII',
                python: 'placa.ascii_numero(caracter)',
                description: 'Devuelve el número ASCII de un carácter',
                example: `n = placa.ascii_numero("A")  # 65`,
                params: [
                    { name: 'caracter', type: 'texto', desc: 'Carácter a convertir' }
                ]
            },
            {
                name: 'Operación de bits',
                python: 'placa.operacion_bits(op, a, b)',
                description: 'Realiza una operación bit a bit (y, o, xor, no, desplazamientos)',
                example: `placa.operacion_bits("y", 12, 10)                   # 8 (AND)
placa.operacion_bits("o", 12, 10)                   # 14 (OR)
placa.operacion_bits("xor", 12, 10)                 # 6
placa.operacion_bits("desplazar_izquierda", 1, 4)   # 16`,
                params: [
                    { name: 'op', type: 'texto', desc: '"y", "o", "xor", "no", "desplazar_izquierda" o "desplazar_derecha"' },
                    { name: 'a', type: 'número', desc: 'Primer operando' },
                    { name: 'b', type: 'número', desc: 'Segundo operando' }
                ]
            },
            {
                name: 'NOT bits',
                python: 'placa.no_bits(a)',
                description: 'Invierte todos los bits de un número',
                example: `placa.no_bits(12)  # -13`,
                params: [
                    { name: 'a', type: 'número', desc: 'Número a invertir' }
                ]
            }
        ]
    },
    placa_matematicas: {
        name: 'Matemáticas',
        icon: '📐',
        color: '#4C97FF',
        description: 'Funciones matemáticas y estadísticas de arrays',
        blocks: [
            {
                name: 'Potencia',
                python: 'placa.potencia(base, exponente)',
                description: 'Eleva una base a un exponente',
                example: `placa.potencia(2, 8)  # 256.0`,
                params: [
                    { name: 'base', type: 'número', desc: 'Base' },
                    { name: 'exponente', type: 'número', desc: 'Exponente' }
                ]
            },
            {
                name: 'Raíz cuadrada',
                python: 'placa.raiz_cuadrada(numero)',
                description: 'Calcula la raíz cuadrada de un número',
                example: `placa.raiz_cuadrada(16)  # 4.0`,
                params: [
                    { name: 'numero', type: 'número', desc: 'Número (no negativo)' }
                ]
            },
            {
                name: 'Valor absoluto',
                python: 'placa.valor_absoluto(numero)',
                description: 'Devuelve el valor absoluto de un número',
                example: `placa.valor_absoluto(-5)  # 5.0`,
                params: [
                    { name: 'numero', type: 'número', desc: 'Número' }
                ]
            },
            {
                name: 'Redondear',
                python: 'placa.redondear(numero, modo)',
                description: 'Redondea un número (normal, hacia arriba o hacia abajo)',
                example: `placa.redondear(3.7)                     # 4
placa.redondear(3.2, "redondear_arriba")  # 4 (ceil)
placa.redondear(3.9, "redondear_abajo")   # 3 (floor)`,
                params: [
                    { name: 'numero', type: 'número', desc: 'Número a redondear' },
                    { name: 'modo', type: 'texto', desc: '"redondear", "redondear_arriba" o "redondear_abajo" (round, ceil, floor)' }
                ]
            },
            {
                name: 'Redondear decimales',
                python: 'placa.redondear_decimales(numero, decimales)',
                description: 'Redondea un número a un número fijo de decimales',
                example: `placa.redondear_decimales(19.567, 2)  # 19.57`,
                params: [
                    { name: 'numero', type: 'número', desc: 'Número a redondear' },
                    { name: 'decimales', type: 'número', desc: 'Cantidad de decimales' }
                ]
            },
            {
                name: 'Aleatorio en rango',
                python: 'placa.aleatorio_rango(minimo, maximo)',
                description: 'Genera un número entero aleatorio entre dos valores',
                example: `dado = placa.aleatorio_rango(1, 6)`,
                params: [
                    { name: 'minimo', type: 'número', desc: 'Valor mínimo' },
                    { name: 'maximo', type: 'número', desc: 'Valor máximo' }
                ]
            },
            {
                name: 'Semilla aleatoria',
                python: 'placa.semilla_aleatoria(semilla)',
                description: 'Fija la semilla del generador aleatorio',
                example: `placa.semilla_aleatoria(42)
print(placa.aleatorio_rango(1, 100))`,
                params: [
                    { name: 'semilla', type: 'número', desc: 'Semilla' }
                ]
            },
            {
                name: 'Semilla aleatoria analógica',
                python: 'placa.semilla_aleatoria_analogica(pin)',
                description: 'Usa el ruido de un pin analógico como semilla',
                example: `placa.semilla_aleatoria_analogica("A0")`,
                params: [
                    { name: 'pin', type: 'texto', desc: 'Pin analógico (ej. "A0")' }
                ]
            },
            {
                name: 'Microsegundos',
                python: 'placa.micros()',
                description: 'Devuelve los microsegundos transcurridos desde el inicio',
                example: `t = placa.micros()`,
                params: []
            },
            {
                name: 'Suma de array',
                python: 'placa.suma_array(nombre)',
                description: 'Suma todos los elementos de un array',
                example: `total = placa.suma_array("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Promedio de array',
                python: 'placa.promedio_array(nombre)',
                description: 'Calcula el promedio de los elementos de un array',
                example: `media = placa.promedio_array("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Máximo de array',
                python: 'placa.maximo_array(nombre)',
                description: 'Devuelve el valor máximo de un array',
                example: `m = placa.maximo_array("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Mínimo de array',
                python: 'placa.minimo_array(nombre)',
                description: 'Devuelve el valor mínimo de un array',
                example: `m = placa.minimo_array("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Ordenar array',
                python: 'placa.ordenar_array(nombre, orden)',
                description: 'Ordena los elementos de un array',
                example: `placa.ordenar_array("nums", "ascendente")
placa.ordenar_array("nums", "descendente")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'orden', type: 'texto', desc: '"ascendente" o "descendente" (ASC, DESC)' }
                ]
            }
        ]
    },
    placa_texto: {
        name: 'Texto',
        icon: '🔤',
        color: '#FF661A',
        description: 'Operaciones con texto (¡importante! los índices empiezan en 0, igual que en Arduino)',
        blocks: [
            {
                name: 'Longitud',
                python: 'placa.texto_longitud(texto)',
                description: 'Cuenta cuántos caracteres tiene un texto',
                example: `n = placa.texto_longitud("hola")  # 4`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto a medir' }
                ]
            },
            {
                name: 'Carácter en posición',
                python: 'placa.texto_caracter(texto, posicion)',
                description: 'Devuelve el carácter en la posición (empieza en 0, igual que Arduino)',
                example: `placa.texto_caracter("hola", 0)  # "h"
placa.texto_caracter("hola", 3)  # "a"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'posicion', type: 'número', desc: 'Posición (0 = primer carácter)' }
                ]
            },
            {
                name: 'Subcadena',
                python: 'placa.texto_subcadena(texto, inicio, fin)',
                description: 'Devuelve una parte del texto desde inicio hasta fin (inicio en 0, fin no incluido)',
                example: `placa.texto_subcadena("hola mundo", 0, 4)   # "hola"
placa.texto_subcadena("hola mundo", 5, 10)  # "mundo"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'inicio', type: 'número', desc: 'Posición de inicio (0 = primero)' },
                    { name: 'fin', type: 'número', desc: 'Posición final (no incluida)' }
                ]
            },
            {
                name: 'Cambiar mayúsculas/minúsculas',
                python: 'placa.texto_caso(texto, caso)',
                description: 'Convierte el texto a mayúsculas o minúsculas',
                example: `placa.texto_caso("hola", "mayusculas")    # "HOLA"
placa.texto_caso("HOLA", "minusculas")   # "hola"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'caso', type: 'texto', desc: '"mayusculas" o "minusculas" (upper, lower)' }
                ]
            },
            {
                name: 'Recortar',
                python: 'placa.texto_recortar(texto)',
                description: 'Elimina los espacios al inicio y al final del texto',
                example: `placa.texto_recortar("  hola  ")  # "hola"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' }
                ]
            },
            {
                name: 'Empieza con',
                python: 'placa.texto_empieza_con(texto, prefijo)',
                description: 'Devuelve True si el texto empieza con el prefijo',
                example: `if placa.texto_empieza_con("hola", "ho"):
    print("Empieza")`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'prefijo', type: 'texto', desc: 'Prefijo a comprobar' }
                ]
            },
            {
                name: 'Termina con',
                python: 'placa.texto_termina_con(texto, sufijo)',
                description: 'Devuelve True si el texto termina con el sufijo',
                example: `if placa.texto_termina_con("hola", "la"):
    print("Termina")`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'sufijo', type: 'texto', desc: 'Sufijo a comprobar' }
                ]
            },
            {
                name: 'Índice de',
                python: 'placa.texto_indice_de(texto, busqueda)',
                description: 'Busca un texto dentro de otro y devuelve su posición (empieza en 0; -1 si no existe)',
                example: `placa.texto_indice_de("hola", "l")  # 2
placa.texto_indice_de("hola", "z")  # -1 si no está`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto donde buscar' },
                    { name: 'busqueda', type: 'texto', desc: 'Texto a buscar' }
                ]
            },
            {
                name: 'Reemplazar',
                python: 'placa.texto_reemplazar(texto, viejo, nuevo)',
                description: 'Reemplaza todas las ocurrencias de un texto por otro',
                example: `placa.texto_reemplazar("hola", "o", "0")  # "h0la"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto original' },
                    { name: 'viejo', type: 'texto', desc: 'Texto a reemplazar' },
                    { name: 'nuevo', type: 'texto', desc: 'Texto nuevo' }
                ]
            },
            {
                name: 'Repetir',
                python: 'placa.texto_repetir(texto, veces)',
                description: 'Repite un texto un número de veces',
                example: `placa.texto_repetir("ab", 3)  # "ababab"`,
                params: [
                    { name: 'texto', type: 'texto', desc: 'Texto' },
                    { name: 'veces', type: 'número', desc: 'Número de repeticiones' }
                ]
            },
            {
                name: 'A ASCII',
                python: 'placa.texto_a_ascii(caracter)',
                description: 'Devuelve el código ASCII del primer carácter',
                example: `placa.texto_a_ascii("A")  # 65`,
                params: [
                    { name: 'caracter', type: 'texto', desc: 'Carácter' }
                ]
            },
            {
                name: 'De ASCII',
                python: 'placa.texto_de_ascii(codigo)',
                description: 'Devuelve el carácter correspondiente a un código ASCII',
                example: `placa.texto_de_ascii(65)  # "A"`,
                params: [
                    { name: 'codigo', type: 'número', desc: 'Código ASCII (0-255)' }
                ]
            }
        ]
    },
    placa_arrays: {
        name: 'Arrays',
        icon: '🗃️',
        color: '#FF6680',
        description: 'Arreglos de datos con índices desde 0',
        blocks: [
            {
                name: 'Declarar array',
                python: 'placa.array_declarar(nombre, tipo, tamaño)',
                description: 'Crea un array de un tamaño fijo (elementos en 0)',
                example: `placa.array_declarar("datos", "int", 5)
placa.array_poner("datos", 0, 7)`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'tipo', type: 'texto', desc: '"int", "decimal" o "texto"' },
                    { name: 'tamaño', type: 'número', desc: 'Número de elementos' }
                ]
            },
            {
                name: 'Declarar con valores',
                python: 'placa.array_declarar_con_valores(nombre, tipo, valores)',
                description: 'Crea un array con los valores indicados',
                example: `placa.array_declarar_con_valores("nums", "int", "1,2,3,4")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'tipo', type: 'texto', desc: '"int", "decimal" o "texto"' },
                    { name: 'valores', type: 'texto', desc: 'Valores separados por comas' }
                ]
            },
            {
                name: 'Obtener elemento',
                python: 'placa.array_obtener(nombre, indice)',
                description: 'Devuelve el elemento en la posición (empieza en 0)',
                example: `placa.array_declarar("datos", "int", 5)
placa.array_poner("datos", 0, 7)
print(placa.array_obtener("datos", 0))  # 7`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición (0 = primer elemento)' }
                ]
            },
            {
                name: 'Poner elemento',
                python: 'placa.array_poner(nombre, indice, valor)',
                description: 'Guarda un valor en la posición indicada',
                example: `placa.array_poner("datos", 0, 7)`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición (0 = primer elemento)' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a guardar' }
                ]
            },
            {
                name: 'Longitud',
                python: 'placa.array_longitud(nombre)',
                description: 'Devuelve el número de elementos del array',
                example: `n = placa.array_longitud("datos")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Agregar al final',
                python: 'placa.array_agregar(nombre, valor)',
                description: 'Añade un elemento al final del array',
                example: `placa.array_agregar("nums", 5)`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a agregar' }
                ]
            },
            {
                name: 'Quitar último',
                python: 'placa.array_quitar_ultimo(nombre)',
                description: 'Elimina y devuelve el último elemento',
                example: `ultimo = placa.array_quitar_ultimo("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Insertar',
                python: 'placa.array_insertar(nombre, indice, valor)',
                description: 'Inserta un valor en una posición (desplaza los demás)',
                example: `placa.array_insertar("nums", 0, 9)  # Inserta al inicio`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición donde insertar' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a insertar' }
                ]
            },
            {
                name: 'Eliminar',
                python: 'placa.array_eliminar(nombre, indice)',
                description: 'Elimina el elemento de una posición',
                example: `placa.array_eliminar("nums", 1)`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición a eliminar' }
                ]
            },
            {
                name: 'Índice de',
                python: 'placa.array_indice_de(nombre, valor)',
                description: 'Busca un valor y devuelve su posición (empieza en 0; -1 si no está)',
                example: `pos = placa.array_indice_de("nums", 3)  # 2
if pos == -1:
    print("No está")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a buscar' }
                ]
            },
            {
                name: 'Contiene',
                python: 'placa.array_contiene(nombre, valor)',
                description: 'Devuelve True si el array contiene el valor',
                example: `if placa.array_contiene("nums", 3):
    print("Está")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a comprobar' }
                ]
            },
            {
                name: 'Limpiar',
                python: 'placa.array_limpiar(nombre)',
                description: 'Elimina todos los elementos del array',
                example: `placa.array_limpiar("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            },
            {
                name: 'Invertir',
                python: 'placa.array_invertir(nombre)',
                description: 'Invierte el orden de los elementos',
                example: `placa.array_invertir("nums")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del array' }
                ]
            }
        ]
    },
    placa_structs: {
        name: 'Structs',
        icon: '🏗️',
        color: '#9966FF',
        description: 'Estructuras de datos con varios campos',
        blocks: [
            {
                name: 'Definir struct',
                python: 'placa.struct_definir(nombre, campos)',
                description: 'Define un tipo de estructura con sus campos',
                example: `placa.struct_definir("Persona", "nombre,edad")`,
                params: [
                    { name: 'nombre', type: 'texto', desc: 'Nombre del tipo de struct' },
                    { name: 'campos', type: 'texto', desc: 'Nombres de los campos separados por comas' }
                ]
            },
            {
                name: 'Crear variable',
                python: 'placa.struct_crear(nombre_variable, nombre_struct)',
                description: 'Crea una variable del tipo de struct definido',
                example: `placa.struct_crear("p", "Persona")`,
                params: [
                    { name: 'nombre_variable', type: 'texto', desc: 'Nombre de la variable' },
                    { name: 'nombre_struct', type: 'texto', desc: 'Tipo de struct' }
                ]
            },
            {
                name: 'Poner campo',
                python: 'placa.struct_poner(nombre_variable, campo, valor)',
                description: 'Guarda un valor en un campo de la estructura',
                example: `placa.struct_poner("p", "nombre", "Ana")`,
                params: [
                    { name: 'nombre_variable', type: 'texto', desc: 'Nombre de la variable' },
                    { name: 'campo', type: 'texto', desc: 'Campo a modificar' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a guardar' }
                ]
            },
            {
                name: 'Obtener campo',
                python: 'placa.struct_obtener(nombre_variable, campo)',
                description: 'Devuelve el valor de un campo de la estructura',
                example: `print(placa.struct_obtener("p", "nombre"))  # "Ana"`,
                params: [
                    { name: 'nombre_variable', type: 'texto', desc: 'Nombre de la variable' },
                    { name: 'campo', type: 'texto', desc: 'Campo a leer' }
                ]
            },
            {
                name: 'Crear array de structs',
                python: 'placa.struct_array_crear(nombre_array, nombre_struct, tamaño)',
                description: 'Crea un array de estructuras',
                example: `placa.struct_array_crear("gente", "Persona", 3)`,
                params: [
                    { name: 'nombre_array', type: 'texto', desc: 'Nombre del array' },
                    { name: 'nombre_struct', type: 'texto', desc: 'Tipo de struct' },
                    { name: 'tamaño', type: 'número', desc: 'Número de elementos' }
                ]
            },
            {
                name: 'Poner en array',
                python: 'placa.struct_array_poner(nombre_array, indice, campo, valor)',
                description: 'Guarda un valor en un campo del elemento indicado',
                example: `placa.struct_array_poner("gente", 1, "edad", 30)`,
                params: [
                    { name: 'nombre_array', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición (0 = primero)' },
                    { name: 'campo', type: 'texto', desc: 'Campo a modificar' },
                    { name: 'valor', type: 'cualquiera', desc: 'Valor a guardar' }
                ]
            },
            {
                name: 'Obtener de array',
                python: 'placa.struct_array_obtener(nombre_array, indice, campo)',
                description: 'Devuelve el valor de un campo del elemento indicado',
                example: `print(placa.struct_array_obtener("gente", 1, "edad"))  # 30`,
                params: [
                    { name: 'nombre_array', type: 'texto', desc: 'Nombre del array' },
                    { name: 'indice', type: 'número', desc: 'Posición (0 = primero)' },
                    { name: 'campo', type: 'texto', desc: 'Campo a leer' }
                ]
            }
        ]
    }
};

export const CATEGORIES = Object.keys(PYTHON_REFERENCE);
