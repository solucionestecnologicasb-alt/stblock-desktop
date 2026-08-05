const path = require('path');
const https = require('https');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const commonHtmlWebpackPluginOptions = {
    // Google Tag Manager ID
    // Looks like 'GTM-XXXXXXX'
    gtm_id: process.env.GTM_ID || '',

    // Google Tag Manager env & auth info for alterative GTM environments
    // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
    // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
    // Blank for production
    gtm_env_auth: process.env.GTM_ENV_AUTH || ''
};

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        shouldSplitChunks: false,
        publicPath: 'auto'
    })
    .setTarget('browserslist')
    .merge({
        output: {
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            }
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset' // let webpack decide on the best type of asset
    })
    .addModuleRule({
        test: /\.(ttf|woff|woff2|eot)$/,
        type: 'asset/resource',
        generator: {
            filename: 'static/fonts/[name].[hash][ext]'
        }
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/default'
            },
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/themes/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: 'node_modules/scratch-vm/dist/web',
                from: 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            }
        ]
    }))
    .addPlugin(new MonacoWebpackPlugin({
        // Only include the languages we need
        languages: ['cpp', 'python', 'javascript'],
        // Features we want to include
        features: [
            'bracketMatching',
            'folding',
            'hover',
            'wordHighlighter',
            'find',
            'clipboard',
            'contextmenu',
            'suggest',
            'comment',
            'indentation'
        ]
    }));

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addExternals(['react', 'react-dom'])
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig.clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        entry: {
            gui: './src/playground/index.jsx',
            blocksonly: './src/playground/blocks-only.jsx',
            compatibilitytesting: './src/playground/compatibility-testing.jsx',
            player: './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build')
        }
    })
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['gui'],
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['blocksonly'],
        filename: 'blocks-only.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Blocks Only Example'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['compatibilitytesting'],
        filename: 'compatibility-testing.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Compatibility Testing'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['player'],
        filename: 'player.html',
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 GUI: Player Example'
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'static',
                to: 'static'
            },
            {
                from: 'static/velxio/boards/**',
                to: 'boards'
            },
            {
                from: 'static/velxio/component-svgs/**',
                to: 'component-svgs'
            },
            {
                from: 'extensions/**',
                to: 'static',
                context: 'src/examples'
            }
        ]
    }));

// Skip building `dist/` unless explicitly requested
// It roughly doubles build time and isn't needed for `scratch-gui` development
// If you need non-production `dist/` for local dev, such as for `scratch-www` work, you can run something like:
// `BUILD_MODE=dist npm run build`
const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

var finalConfig = buildDist ?
    [buildConfig.get(), distConfig.get()] :
    buildConfig.get();

// ── Reenvío manual de POST /pollinations (defensa robusta) ──
// Pollinations (tier anónimo) devuelve:
//  - 403 "Missing Turnstile token" si el Origin es exactamente `localhost`.
//  - 402 "Payment Required" si el body JSON incluye `temperature`.
// Este helper se usa en `setupMiddlewares` ANTES del proxy para limpiar el
// body y reescribir Origin/Referer. Funciona aunque el navegador siga
// ejecutando un bundle antiguo que aún envíe `temperature`.
function forwardPollinationsPost(req, res) {
    var chunks = [];
    req.on('data', function (chunk) {
        chunks.push(chunk);
    });
    req.on('end', function () {
        var rawBody = Buffer.concat(chunks).toString('utf8');
        var body = rawBody;
        try {
            var parsed = JSON.parse(rawBody);
            if (parsed && typeof parsed === 'object') {
                if ('temperature' in parsed) {
                    delete parsed.temperature;
                }
                body = JSON.stringify(parsed);
            }
        } catch (e) {
            // No es JSON: se reenvía tal cual.
        }

        var upstreamReq = https.request({
            hostname: 'text.pollinations.ai',
            port: 443,
            path: '/openai',
            method: 'POST',
            headers: {
                host: 'text.pollinations.ai',
                origin: 'http://127.0.0.1',
                referer: 'http://127.0.0.1/',
                'content-type': req.headers['content-type'] || 'application/json',
                'content-length': Buffer.byteLength(body),
                accept: req.headers.accept || 'application/json',
                'user-agent': req.headers['user-agent'] || 'scratch-gui-dev',
                authorization: req.headers.authorization || ''
            }
        }, function (upstreamRes) {
            res.statusCode = upstreamRes.statusCode || 502;
            Object.keys(upstreamRes.headers).forEach(function (name) {
                if (name === 'transfer-encoding' || name === 'connection') {
                    return;
                }
                var val = upstreamRes.headers[name];
                if (Array.isArray(val)) {
                    val.forEach(function (v) {
                        res.setHeader(name, v);
                    });
                } else {
                    res.setHeader(name, val);
                }
            });
            upstreamRes.pipe(res);
        });

        upstreamReq.on('error', function (err) {
            console.error('[pollinations] Error upstream:', err.message);
            if (!res.headersSent) {
                res.statusCode = 502;
                res.setHeader('content-type', 'application/json; charset=utf-8');
            }
            res.end(JSON.stringify({error: {message: 'Error contacting Pollinations: ' + err.message}}));
        });

        upstreamReq.end(body);
    });
    req.on('error', function () {});
}

// ── Dev server: servir archivos estaticos desde static/ ──
// Necesario para el iframe del simulador Gearbot (static/velxio/gears/index.html)
if (!buildDist && !Array.isArray(finalConfig)) {
    finalConfig.devServer = finalConfig.devServer || {};
    finalConfig.devServer.static = [
        {
            directory: path.resolve(__dirname, 'public'),
            publicPath: '/'
        },
        {
            directory: path.resolve(__dirname, 'static/velxio'),
            publicPath: '/'
        },
        {
            directory: path.resolve(__dirname, 'static'),
            publicPath: '/static'
        }
    ];

    // Proxy para Pollinations.ai en desarrollo local (localhost:8601).
    // El navegador envía `Origin: http://localhost:8601` y Pollinations devuelve
    // 403 "Missing Turnstile token" para el hostname exacto `localhost`. Además,
    // si la petición NO lleva Origin/Referer, devuelve 402 "Payment Required"
    // (no la reconoce como anónima/gratis). Por eso se reescribe el Origin con
    // un hostname no-localhost (127.0.0.1), que pasa ambos controles.
    console.log('[scratch-gui] Proxy configurado: /pollinations -> https://text.pollinations.ai (Origin reescrito a 127.0.0.1)');
    finalConfig.devServer.proxy = [
        {
            context: ['/pollinations'],
            target: 'https://text.pollinations.ai',
            changeOrigin: true,
            pathRewrite: {'^/pollinations': ''},
            onProxyReq: function (proxyReq) {
                proxyReq.setHeader('origin', 'http://127.0.0.1');
                proxyReq.setHeader('referer', 'http://127.0.0.1/');
            }
        }
    ];

    // Intercepta POST /pollinations ANTES del proxy y lo reenvía manualmente.
    // Elimina `temperature` del body (402) y reescribe Origin/Referer (403).
    // Así el chat IA funciona aunque el navegador tenga cargado un bundle viejo.
    finalConfig.devServer.setupMiddlewares = function (middlewares) {
        var sanitize = {
            name: 'pollinations-sanitize',
            middleware: function (req, res, next) {
                if (req.method === 'POST' && req.url && req.url.indexOf('/pollinations') === 0) {
                    forwardPollinationsPost(req, res);
                    return;
                }
                next();
            }
        };
        var proxyIndex = -1;
        for (var i = 0; i < middlewares.length; i++) {
            if (middlewares[i] && middlewares[i].name === 'http-proxy-middleware') {
                proxyIndex = i;
                break;
            }
        }
        if (proxyIndex === -1) {
            middlewares.unshift(sanitize);
        } else {
            middlewares.splice(proxyIndex, 0, sanitize);
        }
        return middlewares;
    };
}

module.exports = finalConfig;
