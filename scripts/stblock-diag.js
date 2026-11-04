/*
 * Panel de diagnóstico de STBlock para builds de prueba en Chromebook.
 *
 * Sólo se inyecta cuando se compila con STBLOCK_ANDROID_DIAG=1 (lo hace
 * scripts/prepare-android-build.mjs). Las compilaciones normales no incluyen
 * este archivo ni el panel.
 *
 * Uso en el dispositivo:
 *   1. Abrir las pantallas que fallen (Programación y Circuito 3D).
 *   2. Escribir con el teclado  stblockdiag  (sin espacios).
 *   3. Pulsar "Copiar todo" y pegar el informe en el chat.
 */
(function () {
  'use strict';

  if (window.__stbDiagInstalled) {
    return;
  }
  window.__stbDiagInstalled = true;

  var BUILD_VERSION = '__STBLOCK_DIAG_VERSION__';
  var MAX_EVENTS = 2500;
  var MAX_TEXT = 400000;
  var startedAt = Date.now();
  var events = [];
  var probes = [];
  var consolePatched = false;

  function elapsed() {
    return Date.now() - startedAt;
  }

  function safeString(value, limit) {
    var text;
    try {
      if (value === null) {
        text = 'null';
      } else if (value === undefined) {
        text = 'undefined';
      } else if (typeof value === 'string') {
        text = value;
      } else if (typeof value === 'function') {
        text = 'function ' + (value.name || '(anonima)');
      } else if (typeof value === 'object') {
        try {
          text = JSON.stringify(value);
        } catch (jsonError) {
          text = Object.prototype.toString.call(value);
        }
      } else {
        text = String(value);
      }
    } catch (stringError) {
      text = '[valor no serializable]';
    }
    if (typeof text !== 'string') {
      text = String(text);
    }
    if (limit && text.length > limit) {
      text = text.slice(0, limit) + '…';
    }
    return text;
  }

  function push(type, data) {
    try {
      if (events.length >= MAX_EVENTS) {
        events.shift();
      }
      events.push({ t: elapsed(), type: type, data: data });
    } catch (pushError) {
      /* el diagnóstico nunca debe romper la app */
    }
  }

  function patchConsole() {
    if (consolePatched) {
      return;
    }
    consolePatched = true;
    var levels = ['log', 'info', 'warn', 'error', 'debug'];
    for (var i = 0; i < levels.length; i++) {
      (function (level) {
        var original = window.console && console[level];
        if (typeof original !== 'function') {
          return;
        }
        console[level] = function () {
          try {
            var args = [];
            for (var a = 0; a < arguments.length && a < 8; a++) {
              args.push(safeString(arguments[a], 1200));
            }
            push('console-' + level, { args: args });
          } catch (logError) {
            /* silencioso */
          }
          return original.apply(console, arguments);
        };
      })(levels[i]);
    }
  }

  function patchNetwork() {
    try {
      var oldFetch = window.fetch;
      if (typeof oldFetch === 'function') {
        window.fetch = function () {
          var url = '';
          try {
            url = String((arguments[0] && arguments[0].url) || arguments[0] || '');
          } catch (urlError) {
            url = '(url ilegible)';
          }
          return oldFetch.apply(this, arguments).then(function (response) {
            if (!response || !response.ok) {
              push('fetch-http-error', { url: url, status: response && response.status });
            }
            return response;
          }, function (error) {
            push('fetch-error', { url: url, error: safeString(error && (error.message || error), 600) });
            throw error;
          });
        };
      }
    } catch (fetchError) {
      /* silencioso */
    }

    try {
      var proto = window.XMLHttpRequest && XMLHttpRequest.prototype;
      if (proto && !proto.__stbDiagPatched) {
        proto.__stbDiagPatched = true;
        var oldOpen = proto.open;
        var oldSend = proto.send;
        proto.open = function (method, url) {
          this.__stbUrl = String(url);
          return oldOpen.apply(this, arguments);
        };
        proto.send = function () {
          var xhr = this;
          try {
            xhr.addEventListener('loadend', function () {
              if (xhr.status === 0 || xhr.status >= 400) {
                push('xhr-error', { url: xhr.__stbUrl, status: xhr.status });
              }
            });
          } catch (sendError) {
            /* silencioso */
          }
          return oldSend.apply(this, arguments);
        };
      }
    } catch (xhrError) {
      /* silencioso */
    }
  }

  function installErrorCapture() {
    window.addEventListener('error', function (event) {
      try {
        var target = event.target;
        if (target && target !== window && target.nodeType === 1) {
          push('resource-error', {
            tag: target.tagName,
            url: target.currentSrc || target.src || target.href || '',
            id: target.id || '',
            className: typeof target.className === 'string' ? target.className : '',
            outerHTML: safeString(target.outerHTML, 500)
          });
        } else {
          push('js-error', {
            message: event.message || '',
            source: event.filename || '',
            line: event.lineno || 0,
            column: event.colno || 0,
            error: safeString(event.error && (event.error.stack || event.error.message || event.error), 1800)
          });
        }
      } catch (errorEventError) {
        /* silencioso */
      }
    }, true);

    window.addEventListener('unhandledrejection', function (event) {
      try {
        push('promise-rejection', {
          reason: safeString(event.reason && (event.reason.stack || event.reason.message || event.reason), 1800)
        });
      } catch (rejectionError) {
        /* silencioso */
      }
    });

    window.addEventListener('load', function () {
      push('page-load', { url: location.href, readyState: document.readyState });
    });
  }

  function cssSupport() {
    var result = {};
    try {
      if (!window.CSS || !CSS.supports) {
        return result;
      }
      result.inset = CSS.supports('inset', '0');
      result.dvh = CSS.supports('height', '100dvh');
      result.clamp = CSS.supports('width', 'clamp(1px,2px,3px)');
      result.minmax = CSS.supports('width', 'min(1px,2px)');
      result.flexGap = CSS.supports('gap', '1px');
      result.aspect = CSS.supports('aspect-ratio', '4/3');
      result.has = CSS.supports('selector(:has(*))');
      result.backdrop = CSS.supports('backdrop-filter', 'blur(2px)');
      result.env = CSS.supports('padding-top', 'env(safe-area-inset-top)');
    } catch (supportError) {
      result.error = safeString(supportError, 200);
    }
    return result;
  }

  function countOf(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch (countError) {
      return -1;
    }
  }

  function rectOfElement(element) {
    if (!element) {
      return null;
    }
    try {
      var rect = element.getBoundingClientRect();
      var style = window.getComputedStyle(element);
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        overflow: style.overflow
      };
    } catch (rectError) {
      return null;
    }
  }

  function rectOfSelector(selector) {
    try {
      return rectOfElement(document.querySelector(selector));
    } catch (selectError) {
      return null;
    }
  }

  function chainOf(element, depth) {
    var chain = [];
    var node = element;
    var steps = 0;
    while (node && node.nodeType === 1 && steps < (depth || 10)) {
      try {
        var rect = node.getBoundingClientRect();
        var style = window.getComputedStyle(node);
        chain.push({
          tag: String(node.tagName || '').toLowerCase(),
          cls: String(node.className || '').slice(0, 120),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          display: style.display,
          position: style.position,
          height: style.height,
          minHeight: style.minHeight,
          flexGrow: style.flexGrow,
          flexBasis: style.flexBasis,
          overflow: style.overflow
        });
      } catch (chainError) {
        chain.push({error: safeString(chainError, 160)});
        break;
      }
      node = node.parentElement;
      steps++;
    }
    return chain;
  }

  /*
   * Sonda específica de STBlock Kids (ScratchJr). Permite distinguir entre:
   *  - el editor atascado en el telón de carga (logo "Scratch Jr"), o
   *  - el editor cargado pero con el layout/controles mal montados.
   */
  function elementProbe(id) {
    return describeElement(document.getElementById(id));
  }

  function elementProbeBySelector(selector) {
    try {
      return describeElement(document.querySelector(selector));
    } catch (selectorError) {
      return {error: safeString(selectorError, 120)};
    }
  }

  function describeElement(element) {
    try {
      if (!element) {
        return null;
      }
      var rect = element.getBoundingClientRect();
      var style = window.getComputedStyle(element);
      return {
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        offsetW: element.offsetWidth,
        offsetH: element.offsetHeight,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        cls: String(element.className || '').slice(0, 80)
      };
    } catch (elementError) {
      return {error: safeString(elementError, 120)};
    }
  }

  function kidsProbe() {
    var kids = {
      page: '',
      mode: '',
      mobile: '',
      isIframe: window.top !== window.self,
      apis: {
        tablet: typeof window.tablet,
        initSqlJs: typeof window.initSqlJs,
        sql: typeof window.SQL,
        scratchJr: typeof window.ScratchJr
      }
    };
    try {
      if (document.body) {
        kids.page = document.body.getAttribute('data-scratchjr-page') || '';
        kids.mode = document.body.getAttribute('data-stblock-kids-mode') || '';
        kids.mobile = document.body.getAttribute('data-stblock-kids-mobile') || '';
      }
    } catch (bodyError) {
      kids.bodyError = safeString(bodyError, 120);
    }

    var sj = null;
    try {
      sj = window.ScratchJr || null;
      kids.hasScratchJr = !!sj;
      if (sj) {
        kids.currentProject = sj.currentProject;
        kids.pageCount = sj.stage && sj.stage.pages ? sj.stage.pages.length : -1;
        kids.currentPageId = sj.stage && sj.stage.currentPage ? (sj.stage.currentPage.id || 'sin-id') : null;
        kids.runtimeInactive = sj.runtime && typeof sj.runtime.inactive === 'function'
          ? (function () {
            try {
              return sj.runtime.inactive();
            } catch (runtimeError) {
              return 'error';
            }
          })()
          : 'sin-runtime';
        kids.projectLoaded = typeof sj.projectLoaded !== 'undefined' ? !!sj.projectLoaded : 'n/a';
      }
    } catch (scratchJrError) {
      kids.scratchJrError = safeString(scratchJrError, 160);
    }

    kids.elements = {
      modaldialog: elementProbe('modaldialog'),
      backdrop: elementProbe('backdrop'),
      progressbar: elementProbe('progressbar'),
      loadicon: (function () {
        try {
          var icon = document.querySelector('.loadicon img') || document.querySelector('.loadicon');
          if (!icon) {
            return null;
          }
          var rect = icon.getBoundingClientRect();
          return {src: icon.currentSrc || icon.src || '', w: Math.round(rect.width), h: Math.round(rect.height)};
        } catch (iconError) {
          return {error: safeString(iconError, 120)};
        }
      })(),
      blockspalette: elementProbe('blockspalette'),
      stage: elementProbe('stage'),
      stageframe: elementProbe('stageframe'),
      scrollarea: elementProbe('scrollarea'),
      frame: elementProbe('frame'),
      centerpanel: (function () {
        try {
          return elementProbeBySelector('.centerpanel');
        } catch (centerError) {
          return {error: safeString(centerError, 120)};
        }
      })(),
      topsection: elementProbe('topsection'),
      scriptscontainer: elementProbe('scriptscontainer'),
      go: elementProbe('go'),
      resetall: elementProbe('resetall'),
      full: elementProbe('full'),
      setbkg: elementProbe('setbkg'),
      addtext: elementProbe('addtext'),
      grid: elementProbe('grid')
    };

    /*
     * El espacio React de STBlock Kids monta los controles dentro del propio
     * iframe, en dos docks creados por scratchjr-kids-workspace.jsx. Si los
     * docks no existen, el montaje falló (por ejemplo por offsetWidth=0).
     */
    try {
      var docks = document.querySelectorAll('.stblock-kids-left-actions, .stblock-kids-right-actions');
      kids.docks = [];
      for (var d = 0; d < docks.length; d++) {
        kids.docks.push({
          cls: String(docks[d].className || ''),
          children: docks[d].children.length,
          ids: (function (dock) {
            var ids = [];
            for (var i = 0; i < dock.children.length && i < 12; i++) {
              ids.push(dock.children[i].id || String(dock.children[i].className || '?'));
            }
            return ids;
          })(docks[d])
        });
      }
    } catch (dockError) {
      kids.docks = 'error: ' + safeString(dockError, 120);
    }

    try {
      kids.htmlKidsAttr = document.documentElement.getAttribute('data-stblock-kids') || '';
      kids.hasModeSwitchVeil = !!document.querySelector('[class*="modeSwitchVeil"]');
    } catch (attrError) {
      /* silencioso */
    }

    return kids;
  }

  function dbSelfTest() {
    try {
      // Sólo tiene sentido en las páginas de ScratchJr (Kids).
      if (!document.body || !document.body.getAttribute('data-scratchjr-page')) {
        return;
      }
      if (!window.tablet || typeof window.tablet.database_query !== 'function') {
        push('kids-db-selftest', {error: 'window.tablet.database_query ausente'});
        return;
      }
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          push('kids-db-selftest-timeout', {afterMs: 4000});
        }
      }, 4000);
      window.tablet.database_query(JSON.stringify({
        op: 'select',
        table: 'projects',
        items: ['id', 'name']
      })).then(function (result) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        var count = -1;
        try {
          var rows = JSON.parse(result);
          count = rows.length;
        } catch (parseError) {
          count = 'no-json:' + safeString(result, 120);
        }
        push('kids-db-selftest', {rows: count, sample: safeString(result, 300)});
      }, function (error) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        push('kids-db-selftest-error', {error: safeString(error && (error.message || error), 400)});
      });
    } catch (testError) {
      push('kids-db-selftest-error', {error: safeString(testError && testError.message, 400)});
    }
  }

  function domProbe() {
    return {
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      bodyChildren: document.body ? document.body.childNodes.length : -1,
      kids: kidsProbe(),
      blockly: typeof window.Blockly !== 'undefined' ? String(window.Blockly.VERSION || 'presente') : 'ausente',
      scratchBlocks: typeof window.ScratchBlocks !== 'undefined' ? 'presente' : 'ausente',
      counts: {
        draggable: countOf('.blocklyDraggable'),
        treeRow: countOf('.blocklyTreeRow'),
        scratchCategory: countOf('.scratchCategoryMenuItem'),
        toolbox: countOf('.blocklyToolboxDiv'),
        flyout: countOf('.blocklyFlyout'),
        svg: countOf('svg.blocklySvg'),
        blockCanvas: countOf('.blocklyBlockCanvas'),
        canvas: countOf('canvas')
      },
      rects: {
        blocksRoot: rectOfSelector('[class*="blocks_blocks"]') || rectOfSelector('.blocks'),
        blocksWrapper: rectOfSelector('[class*="blocks-wrapper"]'),
        activePanel: rectOfSelector('[class*="panelActive"]'),
        panelStack: rectOfSelector('[class*="panelStack"]'),
        injectionDiv: rectOfSelector('.injectionDiv'),
        toolbox: rectOfSelector('.blocklyToolboxDiv'),
        toolboxWrapper: rectOfSelector('.blocklyToolboxWrapper'),
        flyout: rectOfSelector('.blocklyFlyout')
      },
      chain: chainOf(
        document.querySelector('[class*="blocks_blocks"]') || document.querySelector('.blocks'),
        10
      ),
      scripts: (function () {
        var list = [];
        try {
          var nodes = document.scripts;
          for (var i = 0; i < nodes.length && list.length < 40; i++) {
            if (nodes[i].src) {
              list.push(nodes[i].src);
            }
          }
        } catch (scriptError) {
          /* silencioso */
        }
        return list;
      })()
    };
  }

  function androidInfo() {
    var info = { bridge: false };
    try {
      if (window.AndroidBridge) {
        info.bridge = true;
        if (typeof window.AndroidBridge.isAndroid === 'function') {
          info.isAndroid = window.AndroidBridge.isAndroid();
        }
        if (typeof window.AndroidBridge.isChromebook === 'function') {
          info.isChromebook = window.AndroidBridge.isChromebook();
        }
      }
    } catch (bridgeError) {
      info.error = safeString(bridgeError, 200);
    }
    return info;
  }

  function pageInfo() {
    return {
      build: BUILD_VERSION,
      href: location.href,
      isTop: window.top === window.self,
      readyState: document.readyState,
      title: document.title,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      dpr: window.devicePixelRatio,
      viewport: {
        w: window.innerWidth,
        h: window.innerHeight,
        screenW: screen.width,
        screenH: screen.height,
        availW: screen.availWidth,
        availH: screen.availHeight
      },
      css: cssSupport(),
      android: androidInfo()
    };
  }

  function snapshot() {
    return {
      info: pageInfo(),
      probe: domProbe(),
      probes: probes.slice(0),
      events: events.slice(0)
    };
  }

  function probeNow(reason) {
    try {
      var probe = domProbe();
      probe.reason = reason;
      probe.t = elapsed();
      if (probes.length >= 80) {
        probes.shift();
      }
      probes.push(probe);
    } catch (probeError) {
      /* silencioso */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Captura temprana: se instala antes de que corra el JS de la app.    */
  /* ------------------------------------------------------------------ */

  patchConsole();
  patchNetwork();
  installErrorCapture();
  push('page-start', { url: location.href, readyState: document.readyState, ua: navigator.userAgent });
  probeNow('inicio');

  var probeDelays = [1500, 4000, 8000, 15000, 30000];
  for (var p = 0; p < probeDelays.length; p++) {
    (function (delay) {
      setTimeout(function () {
        probeNow('inicio+' + delay + 'ms');
      }, delay);
    })(probeDelays[p]);
  }

  /*
   * Autotest de la base de datos de Kids. Si sql-asm.js está cargado y la
   * base responde, esto devuelve filas; si queda colgado, deja un evento
   * de timeout que delata el punto exacto del bloqueo.
   */
  setTimeout(dbSelfTest, 5000);
  setTimeout(dbSelfTest, 18000);

  /* ------------------------------------------------------------------ */
  /* Panel y reporte: sólo en el documento principal.                    */
  /* ------------------------------------------------------------------ */

  var panel = null;
  var textarea = null;
  var statusLine = null;

  function formatEvent(event, prefix) {
    return '[' + prefix + '+' + event.t + 'ms] ' + event.type + ' ' + safeString(event.data, 1600);
  }

  function gatherFrames() {
    var frames = [];
    var nodes;
    try {
      nodes = document.querySelectorAll('iframe');
    } catch (frameError) {
      return frames;
    }
    for (var i = 0; i < nodes.length; i++) {
      var frame = nodes[i];
      var item = {
        index: i,
        src: frame.src || frame.getAttribute('src') || '',
        id: frame.id || '',
        title: frame.title || '',
        rect: rectOfElement(frame)
      };
      try {
        var win = frame.contentWindow;
        if (win && win.__stbDiag && typeof win.__stbDiag.snapshot === 'function') {
          item.diag = win.__stbDiag.snapshot();
        } else {
          item.diag = null;
          item.missing = true;
          try {
            item.url = win && win.location ? win.location.href : '';
          } catch (locationError) {
            item.url = '(inaccesible)';
          }
        }
      } catch (accessError) {
        item.crossOrigin = safeString(accessError && accessError.message, 200);
      }
      frames.push(item);
    }
    return frames;
  }

  function buildText() {
    var self = snapshot();
    var frames = gatherFrames();
    var lines = [];

    lines.push('=== STBLOCK DIAGNOSTICO ===');
    lines.push('Generado: ' + new Date().toISOString());
    lines.push('Build diag: ' + self.info.build);
    lines.push('URL: ' + self.info.href);
    lines.push('Titulo: ' + self.info.title);
    lines.push('ReadyState: ' + self.info.readyState);
    lines.push('User-Agent: ' + self.info.userAgent);
    lines.push('Plataforma: ' + self.info.platform + ' | idioma: ' + self.info.language + ' | online: ' + self.info.online);
    lines.push('DPR: ' + self.info.dpr);
    lines.push('Viewport: ' + JSON.stringify(self.info.viewport));
    lines.push('CSS soportado: ' + JSON.stringify(self.info.css));
    lines.push('AndroidBridge: ' + JSON.stringify(self.info.android));
    lines.push('');
    lines.push('--- DOM DEL DOCUMENTO PRINCIPAL ---');
    lines.push('Blockly: ' + self.probe.blockly + ' | ScratchBlocks: ' + self.probe.scratchBlocks);
    lines.push('Conteos: ' + JSON.stringify(self.probe.counts));
    lines.push('Kids: ' + safeString(self.probe.kids, 5000));
    lines.push('Rectangulos: ' + JSON.stringify(self.probe.rects));
    lines.push('Cadena de ancestros del workspace:');
    for (var c = 0; c < self.probe.chain.length; c++) {
      lines.push('  [' + c + '] ' + JSON.stringify(self.probe.chain[c]));
    }
    lines.push('Scripts: ' + safeString(self.probe.scripts, 4000));
    lines.push('');
    lines.push('--- SONDAS AUTOMATICAS (' + self.probes.length + ') ---');
    for (var s = 0; s < self.probes.length; s++) {
      var probe = self.probes[s];
      lines.push('[' + probe.reason + ' +' + probe.t + 'ms] blockly=' + probe.blockly +
        ' conteos=' + JSON.stringify(probe.counts) +
        ' toolbox=' + JSON.stringify(probe.rects.toolbox) +
        ' flyout=' + JSON.stringify(probe.rects.flyout));
      if (probe.kids) {
        var k = probe.kids;
        var ke = k.elements || {};
        lines.push('    kids page=' + k.page + ' modo=' + k.mode + ' iframe=' + k.isIframe +
          ' svc=' + (k.hasScratchJr ? 'si' : 'no') + ' proj=' + safeString(k.currentProject, 80) +
          ' paginas=' + k.pageCount + ' tablet=' + k.apis.tablet + ' initSqlJs=' + k.apis.initSqlJs +
          ' modal=' + JSON.stringify(ke.modaldialog) +
          ' progreso=' + JSON.stringify(ke.progressbar) +
          ' paleta=' + JSON.stringify(ke.blockspalette) +
          ' go=' + JSON.stringify(ke.go) +
          ' docks=' + safeString(k.docks, 400));
      }
    }
    lines.push('');
    lines.push('--- IFRAMES (' + frames.length + ') ---');
    for (var f = 0; f < frames.length; f++) {
      var frame = frames[f];
      lines.push('[' + frame.index + '] src=' + frame.src + ' rect=' + JSON.stringify(frame.rect));
      if (frame.crossOrigin) {
        lines.push('    acceso bloqueado: ' + frame.crossOrigin);
        continue;
      }
      if (frame.missing || !frame.diag) {
        lines.push('    sin panel interno (el script no se inyecto o la pagina no cargo). url=' + frame.url);
        continue;
      }
      var diag = frame.diag;
      lines.push('    url=' + diag.info.href + ' ready=' + diag.info.readyState + ' ua=' + diag.info.userAgent);
      lines.push('    Blockly=' + diag.probe.blockly + ' ScratchBlocks=' + diag.probe.scratchBlocks);
      lines.push('    conteos=' + JSON.stringify(diag.probe.counts));
      lines.push('    kids=' + safeString(diag.probe.kids, 5000));
      lines.push('    rects=' + JSON.stringify(diag.probe.rects));
      lines.push('    scripts=' + safeString(diag.probe.scripts, 3000));
      var frameEvents = diag.events;
      var frameStart = Math.max(0, frameEvents.length - 150);
      lines.push('    eventos (' + frameEvents.length + ', mostrando ' + (frameEvents.length - frameStart) + '):');
      for (var fe = frameStart; fe < frameEvents.length; fe++) {
        lines.push('      ' + formatEvent(frameEvents[fe], 'iframe' + frame.index));
      }
    }
    lines.push('');
    lines.push('--- EVENTOS DEL DOCUMENTO PRINCIPAL (' + self.events.length + ') ---');
    for (var e = 0; e < self.events.length; e++) {
      lines.push(formatEvent(self.events[e], 'top'));
    }
    lines.push('');
    lines.push('--- JSON ---');
    try {
      lines.push(JSON.stringify({ self: self, frames: frames }));
    } catch (jsonError) {
      lines.push('{"error":"no se pudo serializar: ' + safeString(jsonError, 200) + '"}');
    }

    var text = lines.join('\n');
    if (text.length > MAX_TEXT) {
      text = text.slice(0, MAX_TEXT) + '\n[...informe recortado por tamano...]';
    }
    return text;
  }

  function setStatus(message) {
    if (statusLine) {
      statusLine.textContent = message;
    }
  }

  function legacyCopy(text) {
    try {
      var helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.left = '-9999px';
      helper.style.top = '0';
      document.body.appendChild(helper);
      helper.focus();
      helper.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(helper);
      setStatus(ok ? 'Copiado al portapapeles.' : 'No se pudo copiar: selecciona el texto y pulsa Ctrl+C.');
    } catch (copyError) {
      setStatus('No se pudo copiar: selecciona el texto y pulsa Ctrl+C.');
    }
  }

  function copyReport() {
    var text = textarea.value || '';
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(function () {
        setStatus('Copiado al portapapeles.');
      }, function () {
        legacyCopy(text);
      });
    } else {
      legacyCopy(text);
    }
  }

  function base64Utf8(text) {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (encodeError) {
      return '';
    }
  }

  function saveReport() {
    try {
      if (!window.AndroidBridge || typeof window.AndroidBridge.saveWithDialog !== 'function') {
        setStatus('Guardar archivo no disponible. Usa Copiar todo.');
        return;
      }
      var content = base64Utf8(textarea.value || '');
      if (!content) {
        setStatus('No se pudo codificar el informe. Usa Copiar todo.');
        return;
      }
      window.AndroidBridge.saveWithDialog('stblock-diagnostico.txt', content);
      setStatus('Elige carpeta para guardar stblock-diagnostico.txt.');
    } catch (saveError) {
      setStatus('Error al guardar: ' + safeString(saveError && saveError.message, 200));
    }
  }

  function refreshPanel() {
    if (!textarea) {
      return;
    }
    textarea.value = buildText();
  }

  function makeButton(label, handler) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.background = '#1f2d3a';
    button.style.color = '#e6f1ff';
    button.style.border = '1px solid #3b536b';
    button.style.borderRadius = '4px';
    button.style.padding = '6px 10px';
    button.style.marginRight = '6px';
    button.style.marginBottom = '4px';
    button.style.fontFamily = 'monospace';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.onclick = handler;
    return button;
  }

  function openPanel() {
    if (window.top !== window.self) {
      try {
        window.parent.postMessage({ __stbDiagOpen: true }, '*');
      } catch (postError) {
        /* silencioso */
      }
      return;
    }
    if (panel && panel.parentNode) {
      panel.style.display = 'flex';
      refreshPanel();
      return;
    }
    if (!document.body) {
      setTimeout(openPanel, 300);
      return;
    }

    panel = document.createElement('div');
    panel.id = '__stb_diag_panel';
    panel.style.position = 'fixed';
    panel.style.top = '0';
    panel.style.left = '0';
    panel.style.right = '0';
    panel.style.bottom = '0';
    panel.style.zIndex = '2147483647';
    panel.style.background = 'rgba(8, 12, 18, 0.97)';
    panel.style.color = '#dbe9f6';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.boxSizing = 'border-box';
    panel.style.padding = '8px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.webkitUserSelect = 'text';
    panel.style.userSelect = 'text';

    var header = document.createElement('div');
    header.style.flex = '0 0 auto';
    header.style.marginBottom = '6px';

    var title = document.createElement('div');
    title.textContent = 'STBlock Diagnostico - build ' + BUILD_VERSION + ' - escribe stblockdiag para abrir/cerrar';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '13px';
    title.style.marginBottom = '6px';
    header.appendChild(title);

    var buttons = document.createElement('div');
    buttons.appendChild(makeButton('Copiar todo', copyReport));
    buttons.appendChild(makeButton('Guardar archivo', saveReport));
    buttons.appendChild(makeButton('Actualizar', function () {
      refreshPanel();
      setStatus('Informe actualizado.');
    }));
    buttons.appendChild(makeButton('Recargar app', function () {
      try {
        location.reload();
      } catch (reloadError) {
        /* silencioso */
      }
    }));
    buttons.appendChild(makeButton('Cerrar', function () {
      panel.style.display = 'none';
    }));
    header.appendChild(buttons);

    statusLine = document.createElement('div');
    statusLine.style.color = '#9fd3ff';
    statusLine.style.minHeight = '16px';
    statusLine.textContent = 'Abre Programacion y Circuito 3D, pulsa Actualizar y luego Copiar todo.';
    header.appendChild(statusLine);

    textarea = document.createElement('textarea');
    textarea.readOnly = true;
    textarea.spellcheck = false;
    textarea.style.flex = '1 1 auto';
    textarea.style.width = '100%';
    textarea.style.boxSizing = 'border-box';
    textarea.style.background = '#05080c';
    textarea.style.color = '#cfe6ff';
    textarea.style.border = '1px solid #2b4358';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '6px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '11px';
    textarea.style.whiteSpace = 'pre';
    textarea.style.overflow = 'auto';
    textarea.style.resize = 'none';
    textarea.style.webkitUserSelect = 'text';
    textarea.style.userSelect = 'text';

    panel.appendChild(header);
    panel.appendChild(textarea);
    document.body.appendChild(panel);

    refreshPanel();
    try {
      textarea.focus();
      textarea.select();
    } catch (selectError) {
      /* silencioso */
    }
  }

  function togglePanel() {
    if (panel && panel.parentNode && panel.style.display !== 'none') {
      panel.style.display = 'none';
      return;
    }
    openPanel();
  }

  window.__stbOpenDiag = openPanel;

  var sequence = '';
  window.addEventListener('keydown', function (event) {
    try {
      if (!event || !event.key || event.key.length !== 1) {
        return;
      }
      sequence = (sequence + event.key.toLowerCase()).slice(-24);
      if (sequence.indexOf('stblockdiag') !== -1) {
        sequence = '';
        togglePanel();
      }
    } catch (keyError) {
      /* silencioso */
    }
  }, true);

  window.addEventListener('message', function (event) {
    try {
      if (event && event.data && event.data.__stbDiagOpen) {
        openPanel();
      }
    } catch (messageError) {
      /* silencioso */
    }
  });

  try {
    if (location.hash === '#stblockdiag') {
      window.setTimeout(openPanel, 500);
    }
  } catch (hashError) {
    /* silencioso */
  }

  window.__stbDiag = {
    snapshot: snapshot,
    events: events,
    open: openPanel,
    build: BUILD_VERSION
  };
})();
