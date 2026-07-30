/**
 * STBlock - Python Runtime usando Pyodide
 *
 * Carga Pyodide desde CDN y proporciona un entorno de ejecución Python
 * que puede interactuar con los sprites de Scratch.
 */

// URL de Pyodide CDN
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';

// Estado del runtime
let pyodideInstance = null;
let isLoading = false;
let loadPromise = null;

// Callbacks para comunicación Python -> JavaScript
let runtimeCallbacks = {};

/**
 * API de STBlock que se inyecta en Python
 */
const STBLOCK_PYTHON_API = `
# ═══════════════════════════════════════════════════════════
# STBlock Python API
# Permite controlar sprites desde código Python
# ═══════════════════════════════════════════════════════════

import js
from pyodide.ffi import create_proxy
import asyncio
import time as _time

def delta_tiempo():
    """Delta time del frame actual"""
    return _call_js('getDeltaTime') or 0.016

def fps():
    """FPS actual"""
    return _call_js('getFPS') or 60

# Referencia al runtime de JavaScript
_runtime = None

def _set_runtime(runtime):
    global _runtime
    _runtime = runtime

def _call_js(method, *args):
    """Llama a un método del runtime de JavaScript"""
    if _runtime and hasattr(_runtime, method):
        return getattr(_runtime, method)(*args)
    return None

# ═══════════════════════════════════════════════════════════
# Clase Sprite - Control del sprite actual
# ═══════════════════════════════════════════════════════════

class _Sprite:
    """Controla el sprite actual en el escenario"""

    def mover(self, pasos):
        """Mover el sprite hacia adelante N pasos"""
        _call_js('moveSteps', pasos)

    def girar_derecha(self, grados):
        """Girar a la derecha N grados"""
        _call_js('turnRight', grados)

    def girar_izquierda(self, grados):
        """Girar a la izquierda N grados"""
        _call_js('turnLeft', grados)

    def ir_a_xy(self, x, y):
        """Ir a la posición (x, y)"""
        _call_js('goToXY', x, y)

    def ir_a(self, destino):
        """Ir hacia un destino (ratón, sprite aleatorio, etc.)"""
        _call_js('goTo', destino)

    def deslizar_a_xy(self, x, y, segundos):
        """Deslizar a (x, y) en N segundos"""
        _call_js('glideToXY', x, y, segundos)

    def apuntar_en_direccion(self, direccion):
        """Apuntar en una dirección (0=arriba, 90=derecha)"""
        _call_js('pointInDirection', direccion)

    def apuntar_hacia(self, objetivo):
        """Apuntar hacia un objetivo"""
        _call_js('pointTowards', objetivo)

    def cambiar_x(self, dx):
        """Cambiar X por un valor"""
        _call_js('changeX', dx)

    def cambiar_y(self, dy):
        """Cambiar Y por un valor"""
        _call_js('changeY', dy)

    def fijar_x(self, x):
        """Fijar la posición X"""
        _call_js('setX', x)

    def fijar_y(self, y):
        """Fijar la posición Y"""
        _call_js('setY', y)

    def rebotar_si_toca_borde(self):
        """Rebotar si toca el borde del escenario"""
        _call_js('bounceOnEdge')

    @property
    def x(self):
        """Posición X del sprite"""
        return _call_js('getX') or 0

    @property
    def y(self):
        """Posición Y del sprite"""
        return _call_js('getY') or 0

    @property
    def direccion(self):
        """Dirección del sprite"""
        return _call_js('getDirection') or 90

    # ─── Apariencia ───

    def decir(self, mensaje, segundos=None):
        """Mostrar un mensaje en un bocadillo"""
        if segundos:
            _call_js('sayForSecs', str(mensaje), segundos)
        else:
            _call_js('say', str(mensaje))

    def pensar(self, mensaje, segundos=None):
        """Mostrar un pensamiento en un bocadillo"""
        if segundos:
            _call_js('thinkForSecs', str(mensaje), segundos)
        else:
            _call_js('think', str(mensaje))

    def cambiar_disfraz(self, nombre):
        """Cambiar al disfraz especificado"""
        _call_js('switchCostume', nombre)

    def siguiente_disfraz(self):
        """Cambiar al siguiente disfraz"""
        _call_js('nextCostume')

    def cambiar_tamaño(self, cambio):
        """Cambiar el tamaño por un porcentaje"""
        _call_js('changeSizeBy', cambio)

    def fijar_tamaño(self, tamaño):
        """Fijar el tamaño a un porcentaje"""
        _call_js('setSizeTo', tamaño)

    def mostrar(self):
        """Hacer visible el sprite"""
        _call_js('show')

    def esconder(self):
        """Hacer invisible el sprite"""
        _call_js('hide')

    def cambiar_efecto(self, efecto, valor):
        """Cambiar un efecto gráfico"""
        _call_js('changeEffect', efecto, valor)

    def fijar_efecto(self, efecto, valor):
        """Fijar un efecto gráfico"""
        _call_js('setEffect', efecto, valor)

    def quitar_efectos(self):
        """Quitar todos los efectos gráficos"""
        _call_js('clearEffects')

    @property
    def tamaño(self):
        """Tamaño actual del sprite"""
        return _call_js('getSize') or 100

    # ─── Sensores ───

    def tocando(self, objetivo):
        """¿Está tocando el objetivo?"""
        return _call_js('isTouching', objetivo) or False

    def tocando_color(self, color):
        """¿Está tocando un color?"""
        return _call_js('isTouchingColor', color) or False

    def distancia_a(self, objetivo):
        """Distancia hasta un objetivo"""
        return _call_js('distanceTo', objetivo) or 0

    # --- Fisica y Gravedad ---

    def saltar(self, fuerza):
        """Hacer que el sprite salte"""
        _call_js('jump', fuerza)

    def aplicar_gravedad(self):
        """Aplicar gravedad al sprite"""
        _call_js('applyGravity')

    def en_suelo(self, tolerancia=5):
        """Esta el sprite en el suelo?"""
        return _call_js('isOnGround', tolerancia) or False

    def en_aire(self):
        """Esta el sprite en el aire?"""
        return _call_js('isInAir') or False

    def fijar_velocidad(self, vx, vy):
        """Fijar velocidad en X e Y"""
        _call_js('setVelocity', vx, vy)

    def fijar_velocidad_x(self, vx):
        """Fijar velocidad en X"""
        _call_js('setVelocityX', vx)

    def fijar_velocidad_y(self, vy):
        """Fijar velocidad en Y"""
        _call_js('setVelocityY', vy)

    def cambiar_velocidad(self, vx, vy):
        """Cambiar la velocidad actual"""
        _call_js('changeVelocity', vx, vy)

    @property
    def velocidad_x(self):
        """Velocidad X actual"""
        return _call_js('getVelocityX') or 0

    @property
    def velocidad_y(self):
        """Velocidad Y actual"""
        return _call_js('getVelocityY') or 0

    def fijar_aceleracion(self, ax, ay):
        """Fijar aceleracion"""
        _call_js('setAcceleration', ax, ay)

    def aplicar_velocidad(self):
        """Aplicar la velocidad a la posicion"""
        _call_js('applyVelocity')

    def fijar_friccion(self, friccion):
        """Fijar coeficiente de friccion"""
        _call_js('setFriction', friccion)

    def fijar_rebote(self, rebote):
        """Fijar coeficiente de rebote"""
        _call_js('setBounce', rebote)

    def aplicar_fuerza(self, fuerza, direccion):
        """Aplicar una fuerza en una direccion"""
        _call_js('applyForce', fuerza, direccion)

    def detener_movimiento(self, eje="todo"):
        """Detener el movimiento (todo, x, y)"""
        _call_js('stopMotion', eje)

    def mantener_en_escenario(self):
        """Mantener el sprite dentro del escenario"""
        _call_js('clampToStage')

    def rebotar_en_borde_escenario(self):
        """Rebotar al tocar el borde del escenario"""
        _call_js('bounceOnStageEdge')

    @property
    def rapidez(self):
        """Magnitud de la velocidad"""
        return _call_js('getSpeed') or 0

    def fijar_masa(self, masa):
        """Fijar la masa del sprite"""
        _call_js('setMass', masa)

    def fijar_control_aire(self, cantidad):
        """Fijar control en el aire"""
        _call_js('setAirControl', cantidad)

    def reiniciar_fisicas(self):
        """Reiniciar propiedades fisicas"""
        _call_js('resetPhysics')

    # --- Salud y Combate ---

    def fijar_salud(self, valor):
        """Fijar la salud actual"""
        _call_js('setHealth', valor)

    def cambiar_salud(self, cantidad):
        """Cambiar la salud"""
        _call_js('changeHealth', cantidad)

    @property
    def salud(self):
        """Salud actual"""
        return _call_js('getHealth') or 100

    def fijar_salud_maxima(self, valor):
        """Fijar la salud maxima"""
        _call_js('setMaxHealth', valor)

    @property
    def salud_maxima(self):
        """Salud maxima"""
        return _call_js('getMaxHealth') or 100

    def salud_porcentaje(self):
        """Salud como porcentaje"""
        return _call_js('getHealthPercent') or 100

    def recibir_dano(self, cantidad):
        """Recibir dano"""
        _call_js('damageSelf', cantidad)

    def curar(self, cantidad):
        """Curar salud"""
        _call_js('healSelf', cantidad)

    def esta_vivo(self):
        """Esta vivo el sprite?"""
        return _call_js('isAlive') or False

    def esta_muerto(self):
        """Esta muerto el sprite?"""
        return not (_call_js('isAlive') or True)

    def fijar_dano_ataque(self, cantidad):
        """Fijar dano de ataque"""
        _call_js('setAttackDamage', cantidad)

    def atacar_si_toca(self, objetivo):
        """Atacar al objetivo si lo toca"""
        _call_js('attackTargetIfTouching', objetivo)

    def danar_objetivo(self, cantidad, objetivo):
        """Hacer dano a un objetivo"""
        _call_js('damageTarget', cantidad, objetivo)

    def hacer_invencible(self, segundos):
        """Hacer invencible por N segundos"""
        _call_js('setInvincible', segundos)

    @property
    def es_invencible(self):
        """Es invencible?"""
        return _call_js('isInvincible') or False

    def retroceso_desde(self, objetivo, fuerza):
        """Retroceso desde un objetivo"""
        _call_js('knockbackFromTarget', objetivo, fuerza)

    def revivir(self, salud):
        """Revivir con cierta salud"""
        _call_js('revive', salud)

    def colisiona_con(self, objetivo):
        """Colisiona con un objetivo?"""
        return _call_js('isCollidingWith', objetivo) or False

    def colocar_en_mundo(self, x, y):
        """Colocar en coordenadas del mundo"""
        _call_js('placeAtWorldXY', x, y)

# ═══════════════════════════════════════════════════════════
# Clase Escenario
# ═══════════════════════════════════════════════════════════

class _Escenario:
    """Controla el escenario"""

    def cambiar_fondo(self, nombre):
        """Cambiar al fondo especificado"""
        _call_js('switchBackdrop', nombre)

    def siguiente_fondo(self):
        """Cambiar al siguiente fondo"""
        _call_js('nextBackdrop')

    @property
    def fondo_nombre(self):
        """Nombre del fondo actual"""
        return _call_js('getBackdropName') or ''

    @property
    def fondo_numero(self):
        """Número del fondo actual"""
        return _call_js('getBackdropNumber') or 1

    @property
    def ancho(self):
        """Ancho del escenario"""
        return _call_js('getStageWidth') or 480

    @property
    def alto(self):
        """Alto del escenario"""
        return _call_js('getStageHeight') or 360
# ═══════════════════════════════════════════════════════════
# Clase Sonido
# ═══════════════════════════════════════════════════════════

class _Sonido:
    """Control de sonido"""

    def reproducir(self, nombre):
        """Reproducir un sonido"""
        _call_js('playSound', nombre)

    def reproducir_hasta_terminar(self, nombre):
        """Reproducir un sonido y esperar a que termine"""
        _call_js('playSoundUntilDone', nombre)

    def detener_todos(self):
        """Detener todos los sonidos"""
        _call_js('stopAllSounds')

    def fijar_volumen(self, volumen):
        """Fijar el volumen (0-100)"""
        _call_js('setVolume', volumen)

    def cambiar_volumen(self, cambio):
        """Cambiar el volumen"""
        _call_js('changeVolume', cambio)

    @property
    def volumen(self):
        """Volumen actual"""
        return _call_js('getVolume') or 100

# ═══════════════════════════════════════════════════════════
# Clase Ratón
# ═══════════════════════════════════════════════════════════

class _Raton:
    """Información del ratón"""

    @property
    def x(self):
        """Posición X del ratón"""
        return _call_js('getMouseX') or 0

    @property
    def y(self):
        """Posición Y del ratón"""
        return _call_js('getMouseY') or 0

    @property
    def presionado(self):
        """¿Está presionado el botón del ratón?"""
        return _call_js('isMouseDown') or False

    @property
    def velocidad(self):
        """Velocidad de movimiento del ratón"""
        return _call_js('getMouseSpeed') or 0

    @property
    def x_anterior(self):
        """Posición X anterior del ratón"""
        return _call_js('getMousePreviousX') or 0

    @property
    def y_anterior(self):
        """Posición Y anterior del ratón"""
        return _call_js('getMousePreviousY') or 0
# ═══════════════════════════════════════════════════════════
# Clase Física (para juegos)
# ═══════════════════════════════════════════════════════════

class _Fisica:
    """Sistema de física para juegos"""

    def fijar_gravedad(self, valor):
        """Fijar la gravedad"""
        _call_js('setGravity', valor)

    def cambiar_gravedad(self, valor):
        """Cambiar la gravedad"""
        _call_js('changeGravity', valor)

    @property
    def gravedad(self):
        """Gravedad actual"""
        return _call_js('getGravity') or 0

    def fijar_velocidad_terminal(self, valor):
        """Fijar velocidad terminal"""
        _call_js('setTerminalVelocity', valor)

    @property
    def velocidad_terminal(self):
        """Velocidad terminal actual"""
        return _call_js('getTerminalVelocity') or 0

    def fijar_suelo_y(self, y):
        """Fijar posición Y del suelo"""
        _call_js('setGroundY', y)

    @property
    def suelo_y(self):
        """Posición Y del suelo"""
        return _call_js('getGroundY') or -180
# ═══════════════════════════════════════════════════════════
# Clase Cámara (para juegos)
# ═══════════════════════════════════════════════════════════

class _Camara:
    """Control de cámara para juegos"""

    def seguir(self, sprite_target=None, suavidad=0.1):
        """La cámara sigue al sprite"""
        _call_js('cameraFollow', suavidad)

    def seguir_objetivo(self, objetivo, suavidad=0.1):
        """La cámara sigue a un objetivo"""
        _call_js('cameraFollowTarget', objetivo, suavidad)

    def fijar_posicion(self, x, y):
        """Fijar posición de la cámara"""
        _call_js('cameraSetXY', x, y)

    def mover(self, x, y):
        """Mover la cámara"""
        _call_js('cameraMove', x, y)

    def sacudir(self, intensidad):
        """Efecto de sacudida"""
        _call_js('cameraShake', intensidad)

    def fijar_zoom(self, nivel):
        """Fijar nivel de zoom"""
        _call_js('cameraSetZoom', nivel)

    def cambiar_zoom(self, cambio):
        """Cambiar nivel de zoom"""
        _call_js('cameraChangeZoom', cambio)

    @property
    def x(self):
        """Posición X de la cámara"""
        return _call_js('getCameraX') or 0

    @property
    def y(self):
        """Posición Y de la cámara"""
        return _call_js('getCameraY') or 0

    @property
    def zoom(self):
        """Nivel de zoom actual"""
        return _call_js('getCameraZoom') or 1

    def mundo_a_pantalla_x(self, x):
        """Convertir coordenada mundo X a pantalla"""
        return _call_js('worldToScreenX', x) or x

    def mundo_a_pantalla_y(self, y):
        """Convertir coordenada mundo Y a pantalla"""
        return _call_js('worldToScreenY', y) or y

    def pantalla_a_mundo_x(self, x):
        """Convertir coordenada pantalla X a mundo"""
        return _call_js('screenToWorldX', x) or x

    def pantalla_a_mundo_y(self, y):
        """Convertir coordenada pantalla Y a mundo"""
        return _call_js('screenToWorldY', y) or y
# ═══════════════════════════════════════════════════════════
# Clase Estado (máquina de estados)
# ═══════════════════════════════════════════════════════════

class _Estado:
    """Máquina de estados para controlar el flujo del juego"""

    def cambiar(self, nombre):
        """Cambiar al estado especificado"""
        _call_js('stateSet', nombre)

    @property
    def actual(self):
        """Nombre del estado actual"""
        return _call_js('stateCurrent') or 'inicio'

    @property
    def anterior(self):
        """Nombre del estado anterior"""
        return _call_js('statePrevious') or ''

    def es(self, nombre):
        """¿El estado actual es el especificado?"""
        return _call_js('stateIs', nombre) or False

    def volver(self):
        """Volver al estado anterior"""
        _call_js('stateBack')

    def reiniciar(self):
        """Reiniciar al estado inicial"""
        _call_js('stateReset')

# ═══════════════════════════════════════════════════════════
# Clase Debug (depuración)
# ═══════════════════════════════════════════════════════════

class _Debug:
    """Herramientas de depuración"""

    def imprimir(self, valor):
        """Imprimir en consola"""
        _call_js('debugLog', str(valor))

    def advertir(self, valor):
        """Advertencia en consola"""
        _call_js('debugWarn', str(valor))

    def error(self, valor):
        """Error en consola"""
        _call_js('debugError', str(valor))

    def pausar_si(self, condicion):
        """Pausar si se cumple la condición"""
        _call_js('debugPauseIf', condicion)

    def marcar(self, nombre):
        """Marcar un punto en el tiempo"""
        _call_js('debugMark', nombre)

    def ms_desde(self, nombre):
        """Milisegundos desde una marca"""
        return _call_js('debugMsSinceMark', nombre) or 0

    def contar(self, nombre):
        """Incrementar un contador"""
        _call_js('debugCount', nombre)

    def contador(self, nombre):
        """Obtener valor de un contador"""
        return _call_js('debugCounter', nombre) or 0

# ═══════════════════════════════════════════════════════════
# Clase Pruebas (testing)
# ═══════════════════════════════════════════════════════════

class _Pruebas:
    """Sistema de pruebas unitarias"""

    def afirmar_verdadero(self, condicion, nombre=""):
        """Afirmar que una condición es verdadera"""
        _call_js('testAssertTrue', condicion, nombre)

    def afirmar_igual(self, valor, esperado, nombre=""):
        """Afirmar que dos valores son iguales"""
        _call_js('testAssertEqual', valor, esperado, nombre)

    def afirmar_entre(self, valor, minimo, maximo, nombre=""):
        """Afirmar que un valor está entre dos números"""
        _call_js('testAssertBetween', valor, minimo, maximo, nombre)

    def reiniciar(self):
        """Reiniciar contadores de pruebas"""
        _call_js('testReset')

    @property
    def pasadas(self):
        """Pruebas pasadas"""
        return _call_js('testPassed') or 0

    @property
    def fallidas(self):
        """Pruebas fallidas"""
        return _call_js('testFailed') or 0

    @property
    def total(self):
        """Total de pruebas"""
        return _call_js('testTotal') or 0

    @property
    def reporte(self):
        """Reporte de pruebas"""
        return _call_js('testReport') or ""

# ═══════════════════════════════════════════════════════════
# Clase IA (inteligencia artificial para enemigos)
# ═══════════════════════════════════════════════════════════

class _IA:
    """Comportamientos de IA para enemigos y NPCs"""

    def mover_a_xy(self, x, y, velocidad=2):
        """Mover IA hacia una posición"""
        _call_js('aiMoveToXY', x, y, velocidad)

    def perseguir(self, objetivo, velocidad=2):
        """Perseguir a un objetivo"""
        _call_js('aiMoveTowardTarget', objetivo, velocidad)

    def huir_de(self, objetivo, velocidad=2):
        """Huir de un objetivo"""
        _call_js('aiFleeFromTarget', objetivo, velocidad)

    def mirar_a(self, objetivo):
        """Mirar hacia un objetivo"""
        _call_js('aiFaceTarget', objetivo)

    def distancia_a(self, objetivo):
        """Distancia al objetivo"""
        return _call_js('aiDistanceToTarget', objetivo) or 0

    def en_rango(self, objetivo, rango):
        """¿El objetivo está en rango?"""
        return _call_js('aiTargetInRange', objetivo, rango) or False

    def patrullar_x(self, x1, x2, velocidad=1):
        """Patrullar entre dos puntos en X"""
        _call_js('aiPatrolX', x1, x2, velocidad)

    def perseguir_si_rango(self, objetivo, rango, velocidad=2):
        """Perseguir solo si el objetivo está en rango"""
        _call_js('aiChaseIfInRange', objetivo, rango, velocidad)

    def mantener_distancia(self, objetivo, minimo, maximo, velocidad=1):
        """Mantener distancia de un objetivo"""
        _call_js('aiKeepDistance', objetivo, minimo, maximo, velocidad)

    def deambular(self, velocidad=1):
        """Deambular aleatoriamente"""
        _call_js('aiWander', velocidad)

    def cerca_de(self, objetivo, distancia):
        """¿Está cerca del objetivo?"""
        return _call_js('aiStopNearTarget', objetivo, distancia) or False

# ═══════════════════════════════════════════════════════════
# Funciones globales
# ═══════════════════════════════════════════════════════════

def esperar(segundos):
    """Esperar N segundos"""
    _call_js('wait', segundos)

def aleatorio(minimo, maximo):
    """Número aleatorio entre mínimo y máximo"""
    import random
    return random.randint(int(minimo), int(maximo))

def preguntar(mensaje):
    """Preguntar al usuario y esperar respuesta"""
    _call_js('ask', str(mensaje))

def tecla_presionada(tecla):
    """¿Está presionada la tecla?"""
    return _call_js('isKeyPressed', tecla) or False

def reiniciar_cronometro():
    """Reiniciar el cronómetro"""
    _call_js('resetTimer')

@property
def cronometro():
    """Valor del cronómetro"""
    return _call_js('getTimer') or 0

@property
def respuesta():
    """Última respuesta del usuario"""
    return _call_js('getAnswer') or ''

def detener_todo():
    """Detener todos los scripts"""
    _call_js('stopAll')

def crear_clon(objetivo='_myself_'):
    """Crear un clon del sprite"""
    _call_js('createClone', objetivo)

def borrar_este_clon():
    """Borrar este clon"""
    _call_js('deleteThisClone')

def enviar_mensaje(mensaje):
    """Enviar un mensaje"""
    _call_js('broadcast', mensaje)

def enviar_mensaje_y_esperar(mensaje):
    """Enviar mensaje y esperar"""
    _call_js('broadcastAndWait', mensaje)

# ─── Operadores matemáticos ───

def redondear(n):
    """Redondear un número"""
    return round(n)

def piso(n):
    """Parte entera inferior"""
    import math
    return math.floor(n)

def techo(n):
    """Parte entera superior"""
    import math
    return math.ceil(n)

def raiz(n):
    """Raíz cuadrada"""
    import math
    return math.sqrt(n)

def seno(n):
    """Seno (grados)"""
    import math
    return math.sin(math.radians(n))

def coseno(n):
    """Coseno (grados)"""
    import math
    return math.cos(math.radians(n))

def tangente(n):
    """Tangente (grados)"""
    import math
    return math.tan(math.radians(n))

# ─── Funciones de texto ───

def unir(a, b):
    """Unir dos textos"""
    return str(a) + str(b)

def letra_de(posicion, texto):
    """Obtener una letra de un texto"""
    try:
        return texto[int(posicion) - 1]
    except:
        return ''

def longitud(texto):
    """Longitud de un texto"""
    return len(str(texto))

# ═══════════════════════════════════════════════════════════
# Instancias globales
# ═══════════════════════════════════════════════════════════

sprite = _Sprite()
escenario = _Escenario()
sonido = _Sonido()
raton = _Raton()
fisica = _Fisica()
camara = _Camara()
estado = _Estado()
debug = _Debug()
pruebas = _Pruebas()
ia = _IA()

def emitir_evento(nombre, dato=None):
    """Emitir un evento personalizado"""
    if dato is not None:
        _call_js('emitCustomEvent', nombre, dato)
    else:
        _call_js('emitCustomEvent', nombre)

def dato_evento(nombre):
    """Obtener dato de un evento personalizado"""
    return _call_js('getEventData', nombre) or None

# Para compatibilidad con el generador
print("✓ STBlock Python API cargada")
`;

/**
 * Carga Pyodide desde CDN
 */
async function loadPyodide() {
    if (pyodideInstance) {
        return pyodideInstance;
    }

    if (isLoading && loadPromise) {
        return loadPromise;
    }

    isLoading = true;

    loadPromise = new Promise(async (resolve, reject) => {
        try {
            // Cargar script de Pyodide
            if (!window.loadPyodide) {
                const script = document.createElement('script');
                script.src = `${PYODIDE_CDN}pyodide.js`;
                script.async = true;

                await new Promise((res, rej) => {
                    script.onload = res;
                    script.onerror = () => rej(new Error('Error cargando Pyodide'));
                    document.head.appendChild(script);
                });
            }

            // Inicializar Pyodide
            pyodideInstance = await window.loadPyodide({
                indexURL: PYODIDE_CDN
            });

            // Inyectar la API de STBlock
            await pyodideInstance.runPythonAsync(STBLOCK_PYTHON_API);

            console.log('[PythonRuntime] Pyodide cargado correctamente');
            isLoading = false;
            resolve(pyodideInstance);

        } catch (error) {
            console.error('[PythonRuntime] Error cargando Pyodide:', error);
            isLoading = false;
            reject(error);
        }
    });

    return loadPromise;
}

/**
 * Configura los callbacks del runtime para comunicación Python -> VM
 */
function setRuntimeCallbacks(callbacks) {
    runtimeCallbacks = callbacks;

    if (pyodideInstance) {
        // Crear objeto proxy para Python
        const runtimeProxy = {};
        for (const [key, fn] of Object.entries(callbacks)) {
            runtimeProxy[key] = fn;
        }

        pyodideInstance.globals.set('_js_runtime', runtimeProxy);
        pyodideInstance.runPython('_set_runtime(_js_runtime)');
    }
}

/**
 * Ejecuta código Python
 */
async function runPython(code, callbacks = null) {
    const pyodide = await loadPyodide();

    if (callbacks) {
        setRuntimeCallbacks(callbacks);
    }

    try {
        // Capturar output
        let output = [];
        pyodide.setStdout({
            batched: (text) => output.push(text)
        });
        pyodide.setStderr({
            batched: (text) => output.push(`Error: ${text}`)
        });

        // Ejecutar código
        const result = await pyodide.runPythonAsync(code);

        return {
            success: true,
            result: result,
            output: output.join('\n')
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            output: ''
        };
    }
}

/**
 * Verifica si Pyodide está listo
 */
function isReady() {
    return pyodideInstance !== null;
}

/**
 * Verifica si está cargando
 */
function isLoadingPyodide() {
    return isLoading;
}

/**
 * Precarga Pyodide (para cargar en background)
 */
function preload() {
    loadPyodide().catch(console.warn);
}

export {
    loadPyodide,
    runPython,
    setRuntimeCallbacks,
    isReady,
    isLoadingPyodide,
    preload
};

export default {
    loadPyodide,
    runPython,
    setRuntimeCallbacks,
    isReady,
    isLoadingPyodide,
    preload
};


