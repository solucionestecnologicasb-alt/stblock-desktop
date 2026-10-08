"""Test funcional de la clase _Placa del STBLOCK_PYTHON_API (sin Pyodide).

Stubea los módulos js / pyodide.ffi, carga el API extraído y verifica:
- Lógica pura (convertir, redondear, operacion_bits, mapear, arrays, structs, texto)
- Enrutado de métodos de I/O a _call_js con los nombres esperados.
"""
import sys
import types

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ── Stubs de Pyodide ──
js_mod = types.ModuleType('js')
sys.modules['js'] = js_mod

pyodide_ffi = types.ModuleType('pyodide.ffi')

def create_proxy(*a, **k):
    return None
pyodide_ffi.create_proxy = create_proxy

pyodide_pkg = types.ModuleType('pyodide')
pyodide_pkg.ffi = pyodide_ffi
sys.modules['pyodide'] = pyodide_pkg
sys.modules['pyodide.ffi'] = pyodide_ffi

# Cargar el API
src = open('_stblock_api_extracted.py', encoding='utf-8').read()
ns = {}
exec(src, ns)

placa = ns['placa']
called = []

# Runtime falso que registra las llamadas
class FakeRuntime:
    def __init__(self):
        self.calls = []
    def __getattr__(self, name):
        def _fn(*args):
            self.calls.append((name, args))
            # Devolver valores para las lecturas
            if name == 'deviceDigitalRead':
                return 1
            if name == 'deviceAnalogRead':
                return 512
            if name == 'deviceMicros':
                return 1234567
            return None
        return _fn

fake = FakeRuntime()
ns['_set_runtime'](fake)

failures = []

def check(label, got, expected):
    if got == expected:
        print(f'[OK] {label}')
    else:
        failures.append(label)
        print(f'[FAIL] {label}: esperado={expected!r} obtenido={got!r}')

# ── Lógica pura ──
check('convertir entero', placa.convertir('entero', 3.9), 3)
check('convertir decimal', placa.convertir('decimal', 3), 3.0)
check('convertir texto', placa.convertir('texto', 42), '42')
check('convertir canónico', placa.convertir('INTEGER', 3.9), 3)
check('redondear', placa.redondear(3.7, 'redondear'), 4)
check('redondear_arriba', placa.redondear(3.2, 'redondear_arriba'), 4)
check('redondear_abajo', placa.redondear(3.9, 'redondear_abajo'), 3)
check('redondear canónico ceil', placa.redondear(3.2, 'ceil'), 4)
check('operacion_bits y', placa.operacion_bits('y', 12, 10), 8)
check('operacion_bits &', placa.operacion_bits('&', 12, 10), 8)
check('operacion_bits o', placa.operacion_bits('o', 12, 10), 14)
check('operacion_bits xor', placa.operacion_bits('xor', 12, 10), 6)
check('operacion_bits no', placa.operacion_bits('no', 12), -13)
check('operacion_bits desplazar_izq', placa.operacion_bits('desplazar_izquierda', 1, 4), 16)
check('mapear', placa.mapear(50, 0, 100, 0, 255), 127.5)
check('limitar', placa.limitar(300, 0, 255), 255)
check('potencia', placa.potencia(2, 8), 256.0)
check('valor_absoluto', placa.valor_absoluto(-5), 5.0)
check('caracter_ascii', placa.caracter_ascii(65), 'A')
check('ascii_numero', placa.ascii_numero('A'), 65)

# Texto
check('texto_longitud', placa.texto_longitud('hola'), 4)
check('texto_caracter', placa.texto_caracter('hola', 2), 'l')
check('texto_subcadena', placa.texto_subcadena('hola mundo', 1, 4), 'ola')
check('texto_caso mayusculas', placa.texto_caso('hola', 'mayusculas'), 'HOLA')
check('texto_caso minusculas', placa.texto_caso('HOLA', 'minusculas'), 'hola')
check('texto_caso upper', placa.texto_caso('hola', 'upper'), 'HOLA')
check('texto_empieza_con', placa.texto_empieza_con('hola', 'ho'), True)
check('texto_indice_de', placa.texto_indice_de('hola', 'l'), 2)
check('texto_indice_de no', placa.texto_indice_de('hola', 'z'), -1)
check('texto_reemplazar', placa.texto_reemplazar('hola', 'o', '0'), 'h0la')
check('texto_repetir', placa.texto_repetir('ab', 3), 'ababab')

# Arrays
placa.array_declarar('datos', 'int', 5)
check('array_declarar tamaño', placa.array_longitud('datos'), 5)
placa.array_poner('datos', 0, 7)
check('array_poner/obtener', placa.array_obtener('datos', 0), 7)
placa.array_declarar_con_valores('nums', 'int', '1,2,3,4')
check('array_declarar_con_valores', placa.array_longitud('nums'), 4)
check('suma_array', placa.suma_array('nums'), 10)
check('promedio_array', placa.promedio_array('nums'), 2.5)
check('maximo_array', placa.maximo_array('nums'), 4)
check('minimo_array', placa.minimo_array('nums'), 1)
placa.array_agregar('nums', 5)
check('array_agregar', placa.array_obtener('nums', 4), 5)
placa.array_ordenar = None  # asegurar no existe conflicto
placa.ordenar_array('nums', 'descendente')
check('array_ordenar desc', placa.array_obtener('nums', 0), 5)
check('array_contiene', placa.array_contiene('nums', 3), True)
check('array_indice_de', placa.array_indice_de('nums', 3), 2)

# Structs
placa.struct_definir('Persona', 'nombre,edad')
placa.struct_crear('p', 'Persona')
placa.struct_poner('p', 'nombre', 'Ana')
check('struct_obtener', placa.struct_obtener('p', 'nombre'), 'Ana')
placa.struct_array_crear('gente', 'Persona', 3)
placa.struct_array_poner('gente', 1, 'edad', 30)
check('struct_array_obtener', placa.struct_array_obtener('gente', 1, 'edad'), 30)
check('struct_array_obtener default', placa.struct_array_obtener('gente', 1, 'nombre'), 0)

# ── Enrutado a _call_js ──
placa.modo(13, 'salida')
placa.escribir_digital(13, 'alto')
placa.escribir_analogico(9, 128)
check('deviceSetPinMode llamado', fake.calls[-3][0], 'deviceSetPinMode')
check('deviceSetPinMode args', fake.calls[-3][1], (13, 'salida'))
check('deviceDigitalWrite args', fake.calls[-2][1], (13, 'alto'))
check('devicePwmWrite args', fake.calls[-1][1], (9, 128))

placa.conectar_servo(9, 500, 2400)
check('deviceServoAttach args', fake.calls[-1][1], (9, 500, 2400))
placa.escribir_servo(9, 90)
check('deviceServoWrite args', fake.calls[-1][1], (9, 90))

placa.serial_iniciar(9600)
check('deviceSerialBegin args', fake.calls[-1][1], (9600,))
placa.serial_enviar('Hola', True)
check('deviceSerialPrint args', fake.calls[-1][1], ('Hola', True))
placa.serial_enviar('Hola', False)
check('deviceSerialPrint eol False', fake.calls[-1][1], ('Hola', False))

check('deviceDigitalRead return', placa.leer_digital(13), 1)
check('deviceAnalogRead return', placa.leer_analogico('A0'), 512)
check('deviceMicros return', placa.micros(), 1234567)

# Decorador
def mi_func():
    return 'ok'
decorada = ns['cuando_placa_inicie'](mi_func)
check('decorador passthrough', decorada, mi_func)

if failures:
    print(f'\nRESULTADO: {len(failures)} FAIL')
    sys.exit(1)
print('\nRESULTADO: TODO OK')
