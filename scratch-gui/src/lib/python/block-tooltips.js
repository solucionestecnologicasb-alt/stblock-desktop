/**
 * STBlock - Tooltips educativos para bloques
 *
 * Muestra la equivalencia en Python de cada bloque de Scratch
 * con ejemplos y descripciones para ayudar al aprendizaje.
 */

export const PYTHON_TOOLTIPS = {
    // ═══════════════════════════════════════════════════════════════
    // MOVIMIENTO
    // ═══════════════════════════════════════════════════════════════

    'motion_movesteps': {
        title: 'Mover pasos',
        python: 'sprite.mover(pasos)',
        description: 'Mueve el sprite hacia adelante en la dirección que está apuntando.',
        example: `# Mover 10 pasos adelante
sprite.mover(10)

# Mover hacia atrás
sprite.mover(-5)`,
        params: [
            { name: 'pasos', type: 'número', desc: 'Cantidad de pasos a mover (puede ser negativo)' }
        ],
        category: 'movimiento'
    },

    'motion_turnright': {
        title: 'Girar derecha',
        python: 'sprite.girar_derecha(grados)',
        description: 'Gira el sprite en sentido de las agujas del reloj.',
        example: `# Girar 90 grados a la derecha
sprite.girar_derecha(90)

# Dar media vuelta
sprite.girar_derecha(180)`,
        params: [
            { name: 'grados', type: 'número', desc: 'Ángulo de giro en grados' }
        ],
        category: 'movimiento'
    },

    'motion_turnleft': {
        title: 'Girar izquierda',
        python: 'sprite.girar_izquierda(grados)',
        description: 'Gira el sprite en sentido contrario a las agujas del reloj.',
        example: `# Girar 90 grados a la izquierda
sprite.girar_izquierda(90)`,
        params: [
            { name: 'grados', type: 'número', desc: 'Ángulo de giro en grados' }
        ],
        category: 'movimiento'
    },

    'motion_gotoxy': {
        title: 'Ir a posición',
        python: 'sprite.ir_a_xy(x, y)',
        description: 'Mueve el sprite instantáneamente a las coordenadas (x, y).',
        example: `# Ir al centro
sprite.ir_a_xy(0, 0)

# Ir a la esquina superior derecha
sprite.ir_a_xy(200, 150)`,
        params: [
            { name: 'x', type: 'número', desc: 'Posición horizontal (-240 a 240)' },
            { name: 'y', type: 'número', desc: 'Posición vertical (-180 a 180)' }
        ],
        category: 'movimiento'
    },

    'motion_glidesecstoxy': {
        title: 'Deslizar a posición',
        python: 'sprite.deslizar_a_xy(x, y, segundos)',
        description: 'Mueve el sprite suavemente a las coordenadas en el tiempo especificado.',
        example: `# Deslizar al centro en 1 segundo
sprite.deslizar_a_xy(0, 0, 1)

# Deslizar lentamente
sprite.deslizar_a_xy(100, 50, 3)`,
        params: [
            { name: 'x', type: 'número', desc: 'Posición X destino' },
            { name: 'y', type: 'número', desc: 'Posición Y destino' },
            { name: 'segundos', type: 'número', desc: 'Duración del movimiento' }
        ],
        category: 'movimiento'
    },

    'motion_pointindirection': {
        title: 'Apuntar en dirección',
        python: 'sprite.apuntar_en_direccion(grados)',
        description: 'Hace que el sprite mire en una dirección específica. 0=arriba, 90=derecha.',
        example: `# Mirar hacia arriba
sprite.apuntar_en_direccion(0)

# Mirar hacia la derecha
sprite.apuntar_en_direccion(90)`,
        params: [
            { name: 'grados', type: 'número', desc: 'Dirección (0=arriba, 90=derecha, 180=abajo, -90=izquierda)' }
        ],
        category: 'movimiento'
    },

    'motion_changexby': {
        title: 'Cambiar X',
        python: 'sprite.cambiar_x(cantidad)',
        description: 'Mueve el sprite horizontalmente sumando a su posición X.',
        example: `# Mover a la derecha
sprite.cambiar_x(10)

# Mover a la izquierda
sprite.cambiar_x(-10)`,
        params: [
            { name: 'cantidad', type: 'número', desc: 'Cantidad a sumar a X' }
        ],
        category: 'movimiento'
    },

    'motion_changeyby': {
        title: 'Cambiar Y',
        python: 'sprite.cambiar_y(cantidad)',
        description: 'Mueve el sprite verticalmente sumando a su posición Y.',
        example: `# Mover hacia arriba
sprite.cambiar_y(10)

# Mover hacia abajo
sprite.cambiar_y(-10)`,
        params: [
            { name: 'cantidad', type: 'número', desc: 'Cantidad a sumar a Y' }
        ],
        category: 'movimiento'
    },

    'motion_setx': {
        title: 'Fijar X',
        python: 'sprite.fijar_x(valor)',
        description: 'Establece la posición horizontal del sprite.',
        example: `# Ir al centro horizontal
sprite.fijar_x(0)`,
        params: [
            { name: 'valor', type: 'número', desc: 'Nueva posición X' }
        ],
        category: 'movimiento'
    },

    'motion_sety': {
        title: 'Fijar Y',
        python: 'sprite.fijar_y(valor)',
        description: 'Establece la posición vertical del sprite.',
        example: `# Ir al centro vertical
sprite.fijar_y(0)`,
        params: [
            { name: 'valor', type: 'número', desc: 'Nueva posición Y' }
        ],
        category: 'movimiento'
    },

    'motion_ifonedgebounce': {
        title: 'Rebotar en borde',
        python: 'sprite.rebotar_si_toca_borde()',
        description: 'Si el sprite toca el borde del escenario, rebota cambiando su dirección.',
        example: `# Mover y rebotar continuamente
while True:
    sprite.mover(10)
    sprite.rebotar_si_toca_borde()`,
        params: [],
        category: 'movimiento'
    },

    // ═══════════════════════════════════════════════════════════════
    // APARIENCIA
    // ═══════════════════════════════════════════════════════════════

    'looks_say': {
        title: 'Decir',
        python: 'sprite.decir(mensaje)',
        description: 'Muestra un bocadillo de texto junto al sprite.',
        example: `# Mostrar un saludo
sprite.decir("¡Hola!")

# Mostrar un número
sprite.decir(42)`,
        params: [
            { name: 'mensaje', type: 'texto', desc: 'Texto a mostrar en el bocadillo' }
        ],
        category: 'apariencia'
    },

    'looks_sayforsecs': {
        title: 'Decir por segundos',
        python: 'sprite.decir(mensaje, segundos)',
        description: 'Muestra un bocadillo de texto durante un tiempo determinado.',
        example: `# Decir algo por 2 segundos
sprite.decir("¡Hola!", 2)`,
        params: [
            { name: 'mensaje', type: 'texto', desc: 'Texto a mostrar' },
            { name: 'segundos', type: 'número', desc: 'Duración del mensaje' }
        ],
        category: 'apariencia'
    },

    'looks_think': {
        title: 'Pensar',
        python: 'sprite.pensar(mensaje)',
        description: 'Muestra un bocadillo de pensamiento junto al sprite.',
        example: `# Mostrar un pensamiento
sprite.pensar("Hmm...")`,
        params: [
            { name: 'mensaje', type: 'texto', desc: 'Texto del pensamiento' }
        ],
        category: 'apariencia'
    },

    'looks_show': {
        title: 'Mostrar',
        python: 'sprite.mostrar()',
        description: 'Hace visible el sprite en el escenario.',
        example: `# Hacer visible el sprite
sprite.mostrar()`,
        params: [],
        category: 'apariencia'
    },

    'looks_hide': {
        title: 'Esconder',
        python: 'sprite.esconder()',
        description: 'Hace invisible el sprite en el escenario.',
        example: `# Ocultar el sprite
sprite.esconder()`,
        params: [],
        category: 'apariencia'
    },

    'looks_switchcostumeto': {
        title: 'Cambiar disfraz',
        python: 'sprite.cambiar_disfraz(nombre)',
        description: 'Cambia la apariencia del sprite al disfraz especificado.',
        example: `# Cambiar a un disfraz específico
sprite.cambiar_disfraz("disfraz2")`,
        params: [
            { name: 'nombre', type: 'texto', desc: 'Nombre del disfraz' }
        ],
        category: 'apariencia'
    },

    'looks_nextcostume': {
        title: 'Siguiente disfraz',
        python: 'sprite.siguiente_disfraz()',
        description: 'Cambia al siguiente disfraz en la lista.',
        example: `# Animar cambiando disfraces
for _ in range(10):
    sprite.siguiente_disfraz()
    esperar(0.1)`,
        params: [],
        category: 'apariencia'
    },

    'looks_changesizeby': {
        title: 'Cambiar tamaño',
        python: 'sprite.cambiar_tamaño(cantidad)',
        description: 'Aumenta o reduce el tamaño del sprite.',
        example: `# Crecer
sprite.cambiar_tamaño(10)

# Encoger
sprite.cambiar_tamaño(-10)`,
        params: [
            { name: 'cantidad', type: 'número', desc: 'Porcentaje a cambiar (puede ser negativo)' }
        ],
        category: 'apariencia'
    },

    'looks_setsizeto': {
        title: 'Fijar tamaño',
        python: 'sprite.fijar_tamaño(porcentaje)',
        description: 'Establece el tamaño del sprite a un porcentaje específico.',
        example: `# Tamaño normal
sprite.fijar_tamaño(100)

# Mitad del tamaño
sprite.fijar_tamaño(50)`,
        params: [
            { name: 'porcentaje', type: 'número', desc: 'Tamaño en porcentaje (100 = normal)' }
        ],
        category: 'apariencia'
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTROL
    // ═══════════════════════════════════════════════════════════════

    'control_wait': {
        title: 'Esperar',
        python: 'esperar(segundos)',
        description: 'Pausa la ejecución del programa por el tiempo especificado.',
        example: `# Esperar 1 segundo
esperar(1)

# Esperar medio segundo
esperar(0.5)`,
        params: [
            { name: 'segundos', type: 'número', desc: 'Tiempo de espera en segundos' }
        ],
        category: 'control'
    },

    'control_repeat': {
        title: 'Repetir N veces',
        python: 'for _ in range(n):',
        description: 'Ejecuta el código interior el número de veces especificado.',
        example: `# Repetir 10 veces
for _ in range(10):
    sprite.mover(10)
    sprite.girar_derecha(36)

# Esto dibuja un decágono`,
        params: [
            { name: 'n', type: 'número', desc: 'Número de repeticiones' }
        ],
        category: 'control'
    },

    'control_forever': {
        title: 'Por siempre',
        python: 'while True:',
        description: 'Repite el código interior infinitamente hasta detener el programa.',
        example: `# Mover continuamente
while True:
    sprite.mover(1)
    sprite.rebotar_si_toca_borde()`,
        params: [],
        category: 'control'
    },

    'control_if': {
        title: 'Si... entonces',
        python: 'if condición:',
        description: 'Ejecuta el código interior solo si la condición es verdadera.',
        example: `# Rebotar si toca el borde
if sprite.tocando("_edge_"):
    sprite.girar_derecha(180)

# Verificar posición
if sprite.x > 200:
    sprite.decir("¡Muy a la derecha!")`,
        params: [
            { name: 'condición', type: 'booleano', desc: 'Condición a evaluar (True/False)' }
        ],
        category: 'control'
    },

    'control_if_else': {
        title: 'Si... sino',
        python: 'if condición:\n    ...\nelse:',
        description: 'Ejecuta un bloque si la condición es verdadera, otro si es falsa.',
        example: `# Decidir dirección
if sprite.x < 0:
    sprite.decir("Izquierda")
else:
    sprite.decir("Derecha")`,
        params: [
            { name: 'condición', type: 'booleano', desc: 'Condición a evaluar' }
        ],
        category: 'control'
    },

    'control_wait_until': {
        title: 'Esperar hasta que',
        python: 'while not condición:\n    esperar(0.01)',
        description: 'Pausa la ejecución hasta que la condición sea verdadera.',
        example: `# Esperar hasta tocar algo
while not sprite.tocando("Sprite2"):
    esperar(0.01)
sprite.decir("¡Te toqué!")`,
        params: [
            { name: 'condición', type: 'booleano', desc: 'Condición que debe cumplirse' }
        ],
        category: 'control'
    },

    'control_repeat_until': {
        title: 'Repetir hasta que',
        python: 'while not condición:',
        description: 'Repite el código hasta que la condición sea verdadera.',
        example: `# Mover hasta tocar el borde
while not sprite.tocando("_edge_"):
    sprite.mover(5)`,
        params: [
            { name: 'condición', type: 'booleano', desc: 'Condición de parada' }
        ],
        category: 'control'
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS
    // ═══════════════════════════════════════════════════════════════

    'event_whenflagclicked': {
        title: 'Al presionar bandera verde',
        python: '@cuando_bandera_verde\ndef inicio():',
        description: 'Este código se ejecuta cuando presionas la bandera verde.',
        example: `@cuando_bandera_verde
def inicio():
    sprite.decir("¡Comenzamos!")
    sprite.ir_a_xy(0, 0)`,
        params: [],
        category: 'eventos'
    },

    'event_whenkeypressed': {
        title: 'Al presionar tecla',
        python: '@cuando_tecla("tecla")\ndef al_presionar():',
        description: 'Este código se ejecuta cuando se presiona la tecla especificada.',
        example: `@cuando_tecla("espacio")
def al_presionar():
    sprite.decir("¡Espacio!")

@cuando_tecla("flecha derecha")
def mover():
    sprite.mover(10)`,
        params: [
            { name: 'tecla', type: 'texto', desc: 'Nombre de la tecla' }
        ],
        category: 'eventos'
    },

    'event_whenthisspriteclicked': {
        title: 'Al hacer clic en sprite',
        python: '@cuando_sprite_clickeado\ndef al_clickear():',
        description: 'Este código se ejecuta cuando haces clic en el sprite.',
        example: `@cuando_sprite_clickeado
def al_clickear():
    sprite.decir("¡Me tocaste!")
    sprite.cambiar_tamaño(10)`,
        params: [],
        category: 'eventos'
    },

    // ═══════════════════════════════════════════════════════════════
    // SENSORES
    // ═══════════════════════════════════════════════════════════════

    'sensing_touchingobject': {
        title: 'Tocando objeto',
        python: 'sprite.tocando(objetivo)',
        description: 'Devuelve True si el sprite está tocando el objeto especificado.',
        example: `# Verificar colisión
if sprite.tocando("Sprite2"):
    sprite.decir("¡Colisión!")

# Verificar borde
if sprite.tocando("_edge_"):
    sprite.girar_derecha(180)`,
        params: [
            { name: 'objetivo', type: 'texto', desc: 'Nombre del sprite, "_mouse_" o "_edge_"' }
        ],
        category: 'sensores'
    },

    'sensing_distanceto': {
        title: 'Distancia a',
        python: 'sprite.distancia_a(objetivo)',
        description: 'Devuelve la distancia en pasos hasta el objeto.',
        example: `# Seguir al ratón si está lejos
if sprite.distancia_a("_mouse_") > 50:
    sprite.apuntar_hacia("_mouse_")
    sprite.mover(5)`,
        params: [
            { name: 'objetivo', type: 'texto', desc: 'Nombre del sprite o "_mouse_"' }
        ],
        category: 'sensores'
    },

    'sensing_keypressed': {
        title: 'Tecla presionada',
        python: 'tecla_presionada(tecla)',
        description: 'Devuelve True si la tecla está siendo presionada.',
        example: `# Control con flechas
while True:
    if tecla_presionada("flecha derecha"):
        sprite.mover(5)
    if tecla_presionada("flecha izquierda"):
        sprite.mover(-5)`,
        params: [
            { name: 'tecla', type: 'texto', desc: 'Nombre de la tecla a verificar' }
        ],
        category: 'sensores'
    },

    'sensing_mousedown': {
        title: 'Ratón presionado',
        python: 'raton.presionado',
        description: 'Devuelve True si el botón del ratón está presionado.',
        example: `# Dibujar mientras se presiona
if raton.presionado:
    sprite.ir_a_xy(raton.x, raton.y)`,
        params: [],
        category: 'sensores'
    },

    'sensing_mousex': {
        title: 'Posición X del ratón',
        python: 'raton.x',
        description: 'Devuelve la posición horizontal del ratón.',
        example: `# Seguir al ratón
sprite.fijar_x(raton.x)`,
        params: [],
        category: 'sensores'
    },

    'sensing_mousey': {
        title: 'Posición Y del ratón',
        python: 'raton.y',
        description: 'Devuelve la posición vertical del ratón.',
        example: `# Seguir al ratón
sprite.fijar_y(raton.y)`,
        params: [],
        category: 'sensores'
    },

    // ═══════════════════════════════════════════════════════════════
    // OPERADORES
    // ═══════════════════════════════════════════════════════════════

    'operator_add': {
        title: 'Suma',
        python: 'a + b',
        description: 'Suma dos números.',
        example: `# Sumar números
resultado = 5 + 3  # resultado = 8

# Usar en movimiento
sprite.mover(10 + 5)`,
        params: [
            { name: 'a', type: 'número', desc: 'Primer número' },
            { name: 'b', type: 'número', desc: 'Segundo número' }
        ],
        category: 'operadores'
    },

    'operator_subtract': {
        title: 'Resta',
        python: 'a - b',
        description: 'Resta dos números.',
        example: `resultado = 10 - 3  # resultado = 7`,
        params: [
            { name: 'a', type: 'número', desc: 'Número del que restar' },
            { name: 'b', type: 'número', desc: 'Número a restar' }
        ],
        category: 'operadores'
    },

    'operator_multiply': {
        title: 'Multiplicación',
        python: 'a * b',
        description: 'Multiplica dos números.',
        example: `resultado = 4 * 3  # resultado = 12`,
        params: [
            { name: 'a', type: 'número', desc: 'Primer factor' },
            { name: 'b', type: 'número', desc: 'Segundo factor' }
        ],
        category: 'operadores'
    },

    'operator_divide': {
        title: 'División',
        python: 'a / b',
        description: 'Divide dos números.',
        example: `resultado = 10 / 2  # resultado = 5.0`,
        params: [
            { name: 'a', type: 'número', desc: 'Dividendo' },
            { name: 'b', type: 'número', desc: 'Divisor' }
        ],
        category: 'operadores'
    },

    'operator_random': {
        title: 'Número aleatorio',
        python: 'aleatorio(min, max)',
        description: 'Devuelve un número aleatorio entre min y max.',
        example: `# Posición aleatoria
x = aleatorio(-200, 200)
y = aleatorio(-150, 150)
sprite.ir_a_xy(x, y)`,
        params: [
            { name: 'min', type: 'número', desc: 'Valor mínimo' },
            { name: 'max', type: 'número', desc: 'Valor máximo' }
        ],
        category: 'operadores'
    },

    'operator_gt': {
        title: 'Mayor que',
        python: 'a > b',
        description: 'Devuelve True si a es mayor que b.',
        example: `if sprite.x > 100:
    sprite.decir("Muy a la derecha")`,
        params: [],
        category: 'operadores'
    },

    'operator_lt': {
        title: 'Menor que',
        python: 'a < b',
        description: 'Devuelve True si a es menor que b.',
        example: `if sprite.tamaño < 50:
    sprite.decir("Soy pequeño")`,
        params: [],
        category: 'operadores'
    },

    'operator_equals': {
        title: 'Igual a',
        python: 'a == b',
        description: 'Devuelve True si a es igual a b.',
        example: `if respuesta == "sí":
    sprite.decir("¡Genial!")`,
        params: [],
        category: 'operadores'
    },

    'operator_and': {
        title: 'Y (and)',
        python: 'a and b',
        description: 'Devuelve True si ambas condiciones son verdaderas.',
        example: `if sprite.x > 0 and sprite.y > 0:
    sprite.decir("Cuadrante superior derecho")`,
        params: [],
        category: 'operadores'
    },

    'operator_or': {
        title: 'O (or)',
        python: 'a or b',
        description: 'Devuelve True si al menos una condición es verdadera.',
        example: `if tecla_presionada("a") or tecla_presionada("espacio"):
    sprite.mover(10)`,
        params: [],
        category: 'operadores'
    },

    'operator_not': {
        title: 'No (not)',
        python: 'not a',
        description: 'Invierte el valor: True se convierte en False y viceversa.',
        example: `if not sprite.tocando("_edge_"):
    sprite.mover(5)`,
        params: [],
        category: 'operadores'
    },

    // ═══════════════════════════════════════════════════════════════
    // VARIABLES
    // ═══════════════════════════════════════════════════════════════

    'data_setvariableto': {
        title: 'Fijar variable',
        python: 'variable = valor',
        description: 'Asigna un valor a la variable.',
        example: `# Crear y asignar variable
puntos = 0
nombre = "Jugador 1"
activo = True`,
        params: [
            { name: 'variable', type: 'variable', desc: 'Nombre de la variable' },
            { name: 'valor', type: 'cualquiera', desc: 'Valor a asignar' }
        ],
        category: 'variables'
    },

    'data_changevariableby': {
        title: 'Cambiar variable',
        python: 'variable += cantidad',
        description: 'Suma una cantidad al valor actual de la variable.',
        example: `# Incrementar puntos
puntos += 10

# Decrementar vidas
vidas -= 1`,
        params: [
            { name: 'variable', type: 'variable', desc: 'Nombre de la variable' },
            { name: 'cantidad', type: 'número', desc: 'Cantidad a sumar' }
        ],
        category: 'variables'
    }
};

/**
 * Obtiene el tooltip para un bloque
 */
export function getTooltip(blockType) {
    return PYTHON_TOOLTIPS[blockType] || null;
}

/**
 * Obtiene todos los tooltips de una categoría
 */
export function getTooltipsByCategory(category) {
    return Object.entries(PYTHON_TOOLTIPS)
        .filter(([_, tooltip]) => tooltip.category === category)
        .map(([blockType, tooltip]) => ({ blockType, ...tooltip }));
}

export default PYTHON_TOOLTIPS;
