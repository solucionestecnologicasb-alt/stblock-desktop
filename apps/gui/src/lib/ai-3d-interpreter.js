/**
 * STBlock - Intérprete seguro del DSL de programación 3D procedural.
 *
 * Interpreta un script `script3D` (texto) y produce una lista de ShapeSpec
 * planas que el host aplica en SketchForge. NUNCA usa eval/Function: el
 * evaluador es recursivo sobre tokens.
 *
 * Gramática (la que se documenta al LLM):
 *   Program    := Directive? Statement*
 *   Directive  := 'clear' '=' Bool
 *   Statement  := RepeatStmt | AddStmt
 *   RepeatStmt := 'repeat' '(' Expr ')' 'as' IDENT '{' Statement* '}'
 *   AddStmt    := 'add' KindName '(' ArgList? ')'
 *   Arg        := IDENT '=' (Expr | STRING | Bool)
 *   Expr       := aritmética con + - * / ( ) y números
 *   Primary    := NUMBER | IDENT(variable de índice) | FUNC '(' Expr ')'
 *   FUNC       := 'sin' | 'cos' | 'sqrt' | 'floor'   (sin/cos en grados)
 *
 * Comentarios `//` hasta fin de línea. Saltos de línea separan statements.
 * Única variable: el índice del `repeat` (`as i`). Repeats anidados sombrean.
 *
 * Límites de seguridad: MAX_SHAPES, MAX_REPEAT_ITERS, MAX_DEPTH.
 * Exceder cualquier límite → error y abortar.
 */

export const SHAPE_KINDS = [
    'box',
    'cylinder',
    'sphere',
    'cone',
    'pyramid',
    'wedge',
    'roundRoof',
    'halfSphere',
    'torus',
    'tube',
    'gear',
    'text'
];

export const MAX_SHAPES = 500;
export const MAX_REPEAT_ITERS = 200;
export const MAX_DEPTH = 4;

// Paleta por defecto por índice de forma (colores de SketchForge).
const PALETTE = [
    '#d41721', '#d97813', '#0098c7', '#6e2786', '#f2cf10',
    '#33983d', '#67c4ce', '#c9009a', '#ce7013', '#6f7f8d',
    '#4C97FF', '#9966FF'
];

// Parámetros comunes a todas las formas.
const COMMON_PARAMS = ['name', 'color', 'x', 'z', 'elevation', 'rotation', 'rotationX', 'rotationZ', 'hole'];

// Parámetros permitidos por kind (además de los comunes).
const KIND_PARAMS = {
    box: ['width', 'depth', 'height', 'radius', 'steps', 'bevel'],
    cylinder: ['radius', 'height', 'sides', 'bevel', 'segments'],
    sphere: ['radius', 'steps'],
    cone: ['radius', 'height', 'topRadius', 'baseRadius', 'sides'],
    pyramid: ['width', 'depth', 'height', 'sides'],
    wedge: ['width', 'depth', 'height'],
    roundRoof: ['width', 'depth', 'height', 'sides'],
    halfSphere: ['radius', 'steps'],
    torus: ['radius', 'sides'],
    tube: ['radius', 'height', 'sides', 'bevel'],
    gear: ['radius', 'height', 'teeth', 'toothSize', 'centerHoleSize', 'sides'],
    text: ['width', 'depth', 'height', 'text', 'font']
};

const MATH_FUNCS = {sin: 1, cos: 1, sqrt: 1, floor: 1};

// ─── Tokenizer ────────────────────────────────────────────────────────────

function isDigit(c) {
    return c >= '0' && c <= '9';
}

function isIdentStart(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isIdentPart(c) {
    return isIdentStart(c) || isDigit(c);
}

function tokenize(src) {
    var tokens = [];
    var i = 0;
    var n = src.length;

    while (i < n) {
        var c = src[i];

        if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
            i++;
            continue;
        }

        // Comentario `//` hasta fin de línea
        if (c === '/' && src[i + 1] === '/') {
            while (i < n && src[i] !== '\n') i++;
            continue;
        }

        // Número
        if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
            var start = i;
            while (i < n && isDigit(src[i])) i++;
            if (src[i] === '.') {
                i++;
                while (i < n && isDigit(src[i])) i++;
            }
            tokens.push({type: 'number', value: parseFloat(src.substring(start, i))});
            continue;
        }

        // String (comillas simples o dobles)
        if (c === '"' || c === "'") {
            var quote = c;
            i++;
            var s = '';
            while (i < n && src[i] !== quote) {
                if (src[i] === '\\' && i + 1 < n) {
                    s += src[i + 1];
                    i += 2;
                } else {
                    s += src[i];
                    i++;
                }
            }
            i++; // cierra comilla
            tokens.push({type: 'string', value: s});
            continue;
        }

        // Identificador / keyword
        if (isIdentStart(c)) {
            var start2 = i;
            while (i < n && isIdentPart(src[i])) i++;
            tokens.push({type: 'ident', value: src.substring(start2, i)});
            continue;
        }

        // Puntuación y operadores
        if (c === '(') { tokens.push({type: 'lparen'}); i++; continue; }
        if (c === ')') { tokens.push({type: 'rparen'}); i++; continue; }
        if (c === '{') { tokens.push({type: 'lbrace'}); i++; continue; }
        if (c === '}') { tokens.push({type: 'rbrace'}); i++; continue; }
        if (c === ',') { tokens.push({type: 'comma'}); i++; continue; }
        if (c === '=') { tokens.push({type: 'equals'}); i++; continue; }
        if (c === '+') { tokens.push({type: 'op', value: '+'}); i++; continue; }
        if (c === '-') { tokens.push({type: 'op', value: '-'}); i++; continue; }
        if (c === '*') { tokens.push({type: 'op', value: '*'}); i++; continue; }
        if (c === '/') { tokens.push({type: 'op', value: '/'}); i++; continue; }

        return {error: 'Carácter inesperado "' + c + '" en el script 3D'};
    }

    tokens.push({type: 'eof'});
    return {tokens: tokens};
}

// ─── Parser → AST ─────────────────────────────────────────────────────────

function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
}

Parser.prototype.peek = function (offset) {
    return this.tokens[this.pos + (offset || 0)];
};

Parser.prototype.next = function () {
    var t = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
};

Parser.prototype.expect = function (type) {
    var t = this.next();
    if (t.type !== type) {
        throw new Error('Se esperaba "' + type + '" pero se encontró "' + describeToken(t) + '"');
    }
    return t;
};

Parser.prototype.error = function (msg) {
    var e = new Error(msg);
    e.isParseError = true;
    return e;
};

Parser.prototype.parseProgram = function () {
    var clear = true;
    var body = [];

    // Directive opcional: clear = true/false
    if (this.peek().type === 'ident' && this.peek().value === 'clear') {
        this.next();
        this.expect('equals');
        var boolTok = this.next();
        if (boolTok.type === 'ident' && boolTok.value === 'true') {
            clear = true;
        } else if (boolTok.type === 'ident' && boolTok.value === 'false') {
            clear = false;
        } else {
            throw this.error('"clear" debe ser true o false');
        }
    }

    while (this.peek().type !== 'eof') {
        body.push(this.parseStatement(0));
    }

    return {type: 'program', clear: clear, body: body};
};

Parser.prototype.parseStatement = function (depth) {
    var tok = this.peek();
    if (tok.type === 'ident' && tok.value === 'repeat') {
        if (depth >= MAX_DEPTH) {
            throw this.error('Máximo anidamiento de "repeat" superado (' + MAX_DEPTH + ')');
        }
        return this.parseRepeat(depth);
    }
    if (tok.type === 'ident' && tok.value === 'add') {
        return this.parseAdd();
    }
    throw this.error('Se esperaba "add" o "repeat" pero se encontró "' + describeToken(tok) + '"');
};

Parser.prototype.parseRepeat = function (depth) {
    this.next(); // 'repeat'
    this.expect('lparen');
    var count = this.parseExpr();
    this.expect('rparen');

    var asTok = this.next();
    if (!(asTok.type === 'ident' && asTok.value === 'as')) {
        throw this.error('Se esperaba "as" en el bloque repeat');
    }
    var idTok = this.next();
    if (idTok.type !== 'ident') {
        throw this.error('Se esperaba un nombre de variable tras "as"');
    }

    this.expect('lbrace');
    var body = [];
    while (this.peek().type !== 'rbrace' && this.peek().type !== 'eof') {
        body.push(this.parseStatement(depth + 1));
    }
    this.expect('rbrace');

    return {type: 'repeat', count: count, name: idTok.value, body: body};
};

Parser.prototype.parseAdd = function () {
    this.next(); // 'add'
    var kindTok = this.next();
    if (kindTok.type !== 'ident') {
        throw this.error('Se esperaba un tipo de forma tras "add"');
    }
    var kind = kindTok.value;
    if (SHAPE_KINDS.indexOf(kind) === -1) {
        throw this.error('Tipo de forma desconocido: "' + kind + '"');
    }
    this.expect('lparen');

    var args = {};
    // ArgList opcional
    if (this.peek().type !== 'rparen') {
        for (;;) {
            var nameTok = this.next();
            if (nameTok.type !== 'ident') {
                throw this.error('Se esperaba un nombre de parámetro en "add ' + kind + '(...)"');
            }
            this.expect('equals');
            args[nameTok.value] = this.parseArgValue();
            if (this.peek().type === 'comma') {
                this.next();
                continue;
            }
            break;
        }
    }
    this.expect('rparen');

    return {type: 'add', kind: kind, args: args};
};

Parser.prototype.parseArgValue = function () {
    var tok = this.peek();
    if (tok.type === 'string') {
        this.next();
        return {type: 'str', v: tok.value};
    }
    if (tok.type === 'ident' && (tok.value === 'true' || tok.value === 'false')) {
        this.next();
        return {type: 'bool', v: tok.value === 'true'};
    }
    return {type: 'expr', node: this.parseExpr()};
};

// ─── Expresiones (aritmética) ─────────────────────────────────────────────

Parser.prototype.parseExpr = function () {
    var left = this.parseTerm();
    for (;;) {
        var tok = this.peek();
        if (tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
            this.next();
            var right = this.parseTerm();
            left = {type: 'bin', op: tok.value, l: left, r: right};
        } else {
            break;
        }
    }
    return left;
};

Parser.prototype.parseTerm = function () {
    var left = this.parseUnary();
    for (;;) {
        var tok = this.peek();
        if (tok.type === 'op' && (tok.value === '*' || tok.value === '/')) {
            this.next();
            var right = this.parseUnary();
            left = {type: 'bin', op: tok.value, l: left, r: right};
        } else {
            break;
        }
    }
    return left;
};

Parser.prototype.parseUnary = function () {
    var tok = this.peek();
    if (tok.type === 'op' && tok.value === '-') {
        this.next();
        return {type: 'un', op: '-', e: this.parseUnary()};
    }
    return this.parsePrimary();
};

Parser.prototype.parsePrimary = function () {
    var tok = this.next();

    if (tok.type === 'number') {
        return {type: 'num', v: tok.value};
    }

    if (tok.type === 'lparen') {
        var inner = this.parseExpr();
        this.expect('rparen');
        return inner;
    }

    if (tok.type === 'ident') {
        // Función matemática: sin(expr) / cos(expr) / sqrt(expr) / floor(expr)
        if (MATH_FUNCS[tok.value] && this.peek().type === 'lparen') {
            this.next(); // lparen
            var arg = this.parseExpr();
            this.expect('rparen');
            return {type: 'call', name: tok.value, arg: arg};
        }
        // Variable de índice del repeat
        return {type: 'var', name: tok.value};
    }

    throw this.error('Se esperaba un número, variable o función pero se encontró "' + describeToken(tok) + '"');
};

function describeToken(t) {
    if (t.type === 'eof') return 'fin de script';
    if (t.type === 'number') return String(t.value);
    if (t.type === 'string') return '"' + t.value + '"';
    if (t.type === 'ident') return t.value;
    if (t.type === 'op') return t.value;
    return t.type;
}

// ─── Evaluador (recursivo, sin eval) ──────────────────────────────────────

function Executor(options) {
    this.scopeStack = [];
    this.shapes = [];
    this.warnings = options.warnings || [];
    this.maxShapes = options.maxShapes || MAX_SHAPES;
    this.maxRepeatIters = options.maxRepeatIters || MAX_REPEAT_ITERS;
}

Executor.prototype.pushScope = function (name, value) {
    var scope = {};
    scope[name] = value;
    this.scopeStack.push(scope);
};

Executor.prototype.popScope = function () {
    this.scopeStack.pop();
};

Executor.prototype.lookup = function (name) {
    for (var i = this.scopeStack.length - 1; i >= 0; i--) {
        if (Object.prototype.hasOwnProperty.call(this.scopeStack[i], name)) {
            return this.scopeStack[i][name];
        }
    }
    return null;
};

Executor.prototype.evalNumber = function (node) {
    var r = this.evalExpr(node);
    if (r.error) return r;
    if (typeof r.value !== 'number' || !isFinite(r.value)) {
        return {error: 'La expresión no produjo un número válido'};
    }
    return r;
};

Executor.prototype.evalExpr = function (node) {
    if (node.type === 'num') {
        return {value: node.v};
    }
    if (node.type === 'var') {
        var v = this.lookup(node.name);
        if (v === null) {
            return {error: 'Variable "' + node.name + '" no definida (solo existe el índice de cada repeat)'};
        }
        return {value: v};
    }
    if (node.type === 'un') {
        var u = this.evalExpr(node.e);
        if (u.error) return u;
        return {value: -u.value};
    }
    if (node.type === 'bin') {
        var l = this.evalExpr(node.l);
        if (l.error) return l;
        var r = this.evalExpr(node.r);
        if (r.error) return r;
        if (typeof l.value !== 'number' || typeof r.value !== 'number') {
            return {error: 'Operación "' + node.op + '" requiere números'};
        }
        var result;
        if (node.op === '+') result = l.value + r.value;
        else if (node.op === '-') result = l.value - r.value;
        else if (node.op === '*') result = l.value * r.value;
        else if (node.op === '/') {
            if (r.value === 0) return {error: 'División por cero'};
            result = l.value / r.value;
        }
        return {value: result};
    }
    if (node.type === 'call') {
        var arg = this.evalNumber(node.arg);
        if (arg.error) return arg;
        var x = arg.value;
        if (node.name === 'sin') return {value: Math.sin(x * Math.PI / 180)};
        if (node.name === 'cos') return {value: Math.cos(x * Math.PI / 180)};
        if (node.name === 'sqrt') return {value: Math.sqrt(x)};
        if (node.name === 'floor') return {value: Math.floor(x)};
        return {error: 'Función desconocida "' + node.name + '"'};
    }
    return {error: 'Expresión inválida'};
};

// Construye el ShapeSpec plano para un nodo add, con kind/name/color garantizados.
Executor.prototype.buildShape = function (addNode, index) {
    var kind = addNode.kind;
    var allowed = {};
    for (var ci = 0; ci < COMMON_PARAMS.length; ci++) allowed[COMMON_PARAMS[ci]] = 1;
    var kindParams = KIND_PARAMS[kind];
    for (var ki = 0; ki < kindParams.length; ki++) allowed[kindParams[ki]] = 1;

    var spec = {
        kind: kind,
        name: kind + '_' + (index + 1),
        color: PALETTE[index % PALETTE.length]
    };

    for (var key in addNode.args) {
        if (!Object.prototype.hasOwnProperty.call(addNode.args, key)) continue;
        if (!allowed[key]) {
            this.warnings.push('Parámetro "' + key + '" no aplica a la forma "' + kind + '"; se ignora.');
            continue;
        }
        if (key === 'name' || key === 'color' || key === 'text' || key === 'font') {
            var s = this.evalStringArg(addNode.args[key], key, kind);
            if (s.error) return s;
            spec[key] = s.value;
            continue;
        }
        if (key === 'hole') {
            var b = this.evalBoolArg(addNode.args[key], key);
            if (b.error) return b;
            spec.hole = b.value;
            continue;
        }
        // Parámetro numérico
        var num = this.evalNumberArg(addNode.args[key], key, kind);
        if (num.error) return num;
        spec[key] = num.value;
    }

    // En SketchForge, el cono usa baseRadius/topRadius. `radius` es un atajo
    // para el radio de la base (como en el catálogo de la herramienta).
    if (kind === 'cone' && spec.radius !== undefined) {
        if (spec.baseRadius === undefined) spec.baseRadius = spec.radius;
        if (spec.topRadius === undefined) spec.topRadius = 0;
        delete spec.radius;
    }

    return {spec: spec};
};

Executor.prototype.evalStringArg = function (arg, key, kind) {
    if (arg.type === 'str') return {value: arg.v};
    if (arg.type === 'bool') return {value: arg.v ? 'true' : 'false'};
    var r = this.evalExpr(arg.node);
    if (r.error) return r;
    if (typeof r.value === 'number') return {value: String(r.value)};
    if (typeof r.value === 'string') return {value: r.value};
    return {error: 'El parámetro "' + key + '" de "' + kind + '" debe ser texto'};
};

Executor.prototype.evalBoolArg = function (arg, key) {
    if (arg.type === 'bool') return {value: arg.v};
    if (arg.type === 'str') {
        var s = arg.v.toLowerCase();
        if (s === 'true') return {value: true};
        if (s === 'false') return {value: false};
    }
    return {error: 'El parámetro "' + key + '" debe ser true o false'};
};

Executor.prototype.evalNumberArg = function (arg, key, kind) {
    if (arg.type === 'bool') {
        return {error: 'El parámetro "' + key + '" de "' + kind + '" debe ser numérico'};
    }
    if (arg.type === 'str') {
        var n = parseFloat(arg.v);
        if (!isFinite(n)) {
            return {error: 'El parámetro "' + key + '" de "' + kind + '" debe ser numérico'};
        }
        return {value: n};
    }
    return this.evalNumber(arg.node);
};

Executor.prototype.execute = function (program) {
    var result = this.execStatements(program.body);
    if (result) return result;
    return {clear: program.clear, shapes: this.shapes, warnings: this.warnings};
};

Executor.prototype.execStatements = function (body) {
    for (var i = 0; i < body.length; i++) {
        var err = this.execStatement(body[i]);
        if (err) return {error: err};
        if (this.shapes.length > this.maxShapes) {
            return {error: 'Se excedió el límite de ' + this.maxShapes + ' formas. Reducí los repeat o la cantidad de "add".'};
        }
    }
    return null;
};

Executor.prototype.execStatement = function (stmt) {
    if (stmt.type === 'add') {
        var built = this.buildShape(stmt, this.shapes.length);
        if (built.error) return built.error;
        this.shapes.push(built.spec);
        return null;
    }

    if (stmt.type === 'repeat') {
        var countRes = this.evalNumber(stmt.count);
        if (countRes.error) return 'Error en "repeat": ' + countRes.error;
        var count = Math.round(countRes.value);
        if (count < 0) count = 0;
        if (count > this.maxRepeatIters) {
            return 'El "repeat" excede el límite de ' + this.maxRepeatIters + ' iteraciones';
        }
        for (var i = 0; i < count; i++) {
            this.pushScope(stmt.name, i);
            var err = this.execStatements(stmt.body);
            this.popScope();
            if (err) return err;
        }
        return null;
    }

    return 'Statement desconocido';
};

// ─── API pública ──────────────────────────────────────────────────────────

/**
 * Interpreta un script 3D.
 * @param {string} script3D
 * @returns {{ok:true, clear:boolean, shapes:object[], warnings:string[]}
 *          |{ok:false, errors:string[]}}
 */
export function interpret(script3D) {
    if (typeof script3D !== 'string') {
        return {ok: false, errors: ['script3D debe ser texto']};
    }

    var tokenized = tokenize(script3D);
    if (tokenized.error) {
        return {ok: false, errors: [tokenized.error]};
    }

    var parser = new Parser(tokenized.tokens);
    var program;
    try {
        program = parser.parseProgram();
    } catch (e) {
        return {ok: false, errors: [e.message || 'Error de sintaxis en el script 3D']};
    }

    var warnings = [];
    var executor = new Executor({warnings: warnings});
    var result = executor.execute(program);
    if (result.error) {
        return {ok: false, errors: [result.error]};
    }

    return {
        ok: true,
        clear: result.clear,
        shapes: result.shapes,
        warnings: warnings
    };
}
