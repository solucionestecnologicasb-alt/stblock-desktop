import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {PROVIDERS} from './lib/providers.js';
import {buildPrompt} from './lib/prompt-builder.js';
import {validateXML} from './lib/xml-validator.js';

var app = express();
var PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({limit: '5mb'}));

// ── Determine app root ──
// In production (SEA), STBLOCK_APP_DIR env var is set by the Tauri launcher.
// In development, use process.cwd().
var APP_ROOT = process.env.STBLOCK_APP_DIR || process.cwd();

// ── Gearbot data storage paths ──
var DATA_DIR = path.join(APP_ROOT, 'backend', 'data', 'gears');
var MAPS_DIR = path.join(DATA_DIR, 'maps');
var ROBOTS_DIR = path.join(DATA_DIR, 'robots');
var ASSETS_DIR = path.join(DATA_DIR, 'assets');

// Ensure directories exist
[MAPS_DIR, ROBOTS_DIR, ASSETS_DIR].forEach(function (dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// ── Providers list ──
app.get('/api/providers', function (req, res) {
    var result = {};
    for (var id in PROVIDERS) {
        if (PROVIDERS.hasOwnProperty(id)) {
            var p = PROVIDERS[id];
            result[id] = {
                name: p.name,
                defaultModel: p.defaultModel,
                models: p.models
            };
        }
    }
    res.json(result);
});

// ── Chat endpoint ──
app.post('/api/chat', async function (req, res) {
    var _a = req.body, providerId = _a.provider, model = _a.model,
        apiKey = _a.apiKey, message = _a.message,
        history = _a.history || [], context = _a.context || {};

    // Validate required fields
    if (!providerId || !apiKey || !message) {
        return res.status(400).json({type: 'chat', message: 'Faltan campos requeridos (provider, apiKey, message)'});
    }

    var provider = PROVIDERS[providerId];
    if (!provider) {
        return res.status(400).json({type: 'chat', message: 'Proveedor "' + providerId + '" no soportado'});
    }

    var currentModel = model || provider.defaultModel;

    // Build messages array from history + current message
    var msgs = [];
    var recentHistory = history.slice(-6);
    for (var i = 0; i < recentHistory.length; i++) {
        var h = recentHistory[i];
        msgs.push({role: h.role === 'ai' ? 'assistant' : 'user', content: h.text || ''});
    }
    msgs.push({role: 'user', content: message});

    // Build system prompt with context
    var systemPrompt = buildPrompt({context: context});

    // Detect if user is asking for blocks
    var isBlockRequest = detectBlockIntent(message);

    try {
        var response = await callWithRetry(provider, {
            apiKey: apiKey,
            model: currentModel,
            messages: msgs,
            systemPrompt: systemPrompt
        }, 0);

        // If the response is blocks, validate and optionally retry once
        if (response.type === 'blocks' && response.xml) {
            var validation = validateXML(response.xml);
            if (!validation.valid) {
                // Retry once with explicit instruction to fix
                if (isBlockRequest) {
                    var fixMsg = 'El XML que generaste es inválido: ' + validation.warnings.join(', ') +
                        '. Generá SOLO XML válido de scratch-blocks. Asegurate de que comience con <xml> y termine con </xml>.';
                    msgs.push({role: 'assistant', content: JSON.stringify(response)});
                    msgs.push({role: 'user', content: fixMsg});
                    try {
                        var retryResponse = await callWithRetry(provider, {
                            apiKey: apiKey,
                            model: currentModel,
                            messages: msgs,
                            systemPrompt: systemPrompt
                        }, 0);
                        if (retryResponse.type === 'blocks' && retryResponse.xml) {
                            var retryValidation = validateXML(retryResponse.xml);
                            if (retryValidation.valid) {
                                retryResponse.warnings = validation.warnings;
                                return res.json(retryResponse);
                            }
                            response.warnings = validation.warnings.concat(retryValidation.warnings);
                            response.warnings.push('El XML del reintento también es inválido — se usará el original');
                        }
                    } catch (e) {
                        response.warnings = validation.warnings;
                        response.warnings.push('Error al reintentar: ' + e.message);
                    }
                } else {
                    response.warnings = validation.warnings;
                }
            }
            return res.json(response);
        }

        return res.json(response);

    } catch (err) {
        // Handle 402 for OpenRouter: suggest retry with openrouter/free
        if (providerId === 'openrouter' && err.message === 'SALDO_INSUFICIENTE') {
            if (currentModel !== 'openrouter/free') {
                try {
                    var fallbackResponse = await callWithRetry(provider, {
                        apiKey: apiKey,
                        model: 'openrouter/free',
                        messages: msgs,
                        systemPrompt: systemPrompt
                    }, 0);
                    return res.json(fallbackResponse);
                } catch (fallbackErr) {
                    return res.json({type: 'chat', message: '❌ Todos los modelos de OpenRouter requieren saldo. Cambiá a Groq — es 100% gratis.'});
                }
            }
            return res.json({type: 'chat', message: '❌ Todos los modelos de OpenRouter requieren saldo. Cambiá a Groq — es 100% gratis.'});
        }
        return res.json({type: 'chat', message: '❌ ' + err.message});
    }
});

// ── Retry logic for rate limits ──
async function callWithRetry(provider, opts, attempt) {
    var MAX_RETRIES = 3;
    try {
        return await provider.send(opts);
    } catch (err) {
        if (err.message && err.message.indexOf('RATE_LIMIT') !== -1 && attempt < MAX_RETRIES) {
            var delay = Math.pow(2, attempt + 1) * 1000;
            await new Promise(function (resolve) { setTimeout(resolve, delay); });
            return callWithRetry(provider, opts, attempt + 1);
        }
        throw err;
    }
}

// ── Block intent detection ──
function detectBlockIntent(msg) {
    var keywords = [
        'haz', 'crea', 'genera', 'escribe', 'hacé', 'armá', 'poné',
        'bloque', 'bloques', 'código', 'codigo', 'script', 'scripts',
        'juego', 'movimient', 'program', 'logica', 'funcion',
        'dispar', 'salt', 'corr', 'gravedad', 'puntuacion', 'puntuación',
        'variable', 'lista', 'broadcast', 'mensaje', 'clon', 'sprite',
        'cambia', 'modifica', 'reemplaza', 'agrega', 'añade', 'edita',
        'que haga', 'que se mueva', 'quiero que'
    ];
    var lower = msg.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
        if (lower.indexOf(keywords[i]) !== -1) return true;
    }
    return false;
}

// ── Gearbot Maps CRUD ──

// List all maps
app.get('/api/gears/maps', function (req, res) {
    try {
        var files = fs.readdirSync(MAPS_DIR).filter(function (f) { return f.endsWith('.json'); });
        var maps = files.map(function (f) {
            try {
                return JSON.parse(fs.readFileSync(path.join(MAPS_DIR, f), 'utf-8'));
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        res.json(maps);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Get a specific map
app.get('/api/gears/maps/:id', function (req, res) {
    try {
        var filePath = path.join(MAPS_DIR, req.params.id + '.json');
        if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Mapa no encontrado'});
        var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Save/update a map
app.put('/api/gears/maps/:id', function (req, res) {
    try {
        var filePath = path.join(MAPS_DIR, req.params.id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({success: true, id: req.params.id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete a map
app.delete('/api/gears/maps/:id', function (req, res) {
    try {
        var filePath = path.join(MAPS_DIR, req.params.id + '.json');
        if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Mapa no encontrado'});
        fs.unlinkSync(filePath);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// ── Gearbot Admin Robots CRUD ──

// List all admin robots
app.get('/api/gears/robots/admin', function (req, res) {
    try {
        var files = fs.readdirSync(ROBOTS_DIR).filter(function (f) { return f.endsWith('.json'); });
        var robots = files.map(function (f) {
            try {
                return JSON.parse(fs.readFileSync(path.join(ROBOTS_DIR, f), 'utf-8'));
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        res.json(robots);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Get a specific admin robot
app.get('/api/gears/robots/admin/:id', function (req, res) {
    try {
        var filePath = path.join(ROBOTS_DIR, req.params.id + '.json');
        if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Robot no encontrado'});
        var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Save/update an admin robot
app.put('/api/gears/robots/admin/:id', function (req, res) {
    try {
        var filePath = path.join(ROBOTS_DIR, req.params.id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({success: true, id: req.params.id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete an admin robot
app.delete('/api/gears/robots/admin/:id', function (req, res) {
    try {
        var filePath = path.join(ROBOTS_DIR, req.params.id + '.json');
        if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Robot no encontrado'});
        fs.unlinkSync(filePath);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// ── Gearbot Assets CRUD ──

// Get an asset file (binary)
app.get('/api/gears/assets/:filename', function (req, res) {
    try {
        var filePath = path.join(ASSETS_DIR, req.params.filename);
        // Prevent directory traversal
        if (filePath.indexOf(ASSETS_DIR) !== 0) return res.status(403).json({error: 'Acceso denegado'});
        if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Archivo no encontrado'});
        var ext = path.extname(filePath).toLowerCase();
        var mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.stl': 'model/stl',
            '.obj': 'model/obj',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.json': 'application/json',
            '.js': 'application/javascript',
            '.css': 'text/css'
        };
        var mime = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.sendFile(filePath);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Upload an asset file (binary)
app.put('/api/gears/assets/:filename', express.raw({type: '*/*', limit: '50mb'}), function (req, res) {
    try {
        var filePath = path.join(ASSETS_DIR, req.params.filename);
        if (filePath.indexOf(ASSETS_DIR) !== 0) return res.status(403).json({error: 'Acceso denegado'});
        fs.writeFileSync(filePath, req.body);
        res.json({success: true, filename: req.params.filename});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.listen(PORT, function () {
    console.log('Scratch AI Backend corriendo en puerto ' + PORT);
});
