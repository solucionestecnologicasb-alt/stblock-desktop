/*
 * STBlock: shims para Android System WebView 68 (Chrome 68), usado por las
 * Chromebooks ARC++ antiguas.
 *
 * Los iframes empaquetados (ScratchJr/Kids, Electronics Lab y SketchForge) se
 * compilan con targets modernos: bajan la sintaxis con esbuild, pero siguen
 * esperando APIs de runtime que Chrome 68 no tiene. Este archivo se inyecta
 * como primer <script> de cada iframe y del documento principal, y define sólo
 * lo que falta. Es idempotente y no reemplaza implementaciones existentes.
 *
 * Sintaxis ES5 a propósito: este archivo debe poder ejecutarse cuando el motor
 * todavía no entiende nada más nuevo.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.globalThis === 'undefined') {
    window.globalThis = window;
  }

  // Registro temprano de errores: el diagnóstico nativo se instala en
  // onPageFinished y podría perder los fallos ocurridos durante la evaluación
  // del bundle. PadAssetDelivery lo vuelca como eventos "early-error".
  if (!window.__stbEarlyErrors) {
    var earlyErrors = [];
    window.__stbEarlyErrors = earlyErrors;
    var rememberEarly = function (entry) {
      if (earlyErrors.length < 50) {
        earlyErrors.push(entry);
      }
    };
    window.addEventListener('error', function (event) {
      var target = event.target;
      if (target && target !== window) {
        rememberEarly({
          kind: 'resource',
          tag: String(target.tagName || ''),
          url: String(target.currentSrc || target.src || target.href || '')
        });
        return;
      }
      rememberEarly({
        kind: 'error',
        message: String(event.message || ''),
        source: String(event.filename || ''),
        line: event.lineno || 0,
        column: event.colno || 0
      });
    }, true);
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      rememberEarly({
        kind: 'rejection',
        message: String((reason && reason.stack) || reason || '').slice(0, 800)
      });
    });
  }

  if (typeof Array.prototype.flat !== 'function') {
    Object.defineProperty(Array.prototype, 'flat', {
      configurable: true,
      writable: true,
      value: function flat(depth) {
        var levels = depth === undefined ? 1 : Number(depth);
        if (!(levels > 0)) {
          return Array.prototype.slice.call(this);
        }
        var result = [];
        for (var index = 0; index < this.length; index++) {
          if (!(index in this)) {
            continue;
          }
          var value = this[index];
          if (Array.isArray(value)) {
            var nested = Array.prototype.flat.call(value, levels - 1);
            for (var inner = 0; inner < nested.length; inner++) {
              result.push(nested[inner]);
            }
          } else {
            result.push(value);
          }
        }
        return result;
      }
    });
  }

  if (typeof Array.prototype.flatMap !== 'function') {
    Object.defineProperty(Array.prototype, 'flatMap', {
      configurable: true,
      writable: true,
      value: function flatMap(callback, thisArg) {
        var source = Object(this);
        var length = source.length >>> 0;
        var result = [];
        for (var index = 0; index < length; index++) {
          if (!(index in source)) {
            continue;
          }
          var value = callback.call(thisArg, source[index], index, source);
          if (Array.isArray(value)) {
            for (var inner = 0; inner < value.length; inner++) {
              result.push(value[inner]);
            }
          } else {
            result.push(value);
          }
        }
        return result;
      }
    });
  }

  if (typeof Array.prototype.at !== 'function') {
    Object.defineProperty(Array.prototype, 'at', {
      configurable: true,
      writable: true,
      value: function at(position) {
        var length = this.length >>> 0;
        var index = Math.trunc(Number(position)) || 0;
        if (index < 0) {
          index += length;
        }
        if (index < 0 || index >= length) {
          return undefined;
        }
        return this[index];
      }
    });
  }

  if (typeof Array.prototype.findLast !== 'function') {
    Object.defineProperty(Array.prototype, 'findLast', {
      configurable: true,
      writable: true,
      value: function findLast(callback, thisArg) {
        for (var index = this.length - 1; index >= 0; index--) {
          if (index in this && callback.call(thisArg, this[index], index, this)) {
            return this[index];
          }
        }
        return undefined;
      }
    });
  }

  if (typeof Array.prototype.findLastIndex !== 'function') {
    Object.defineProperty(Array.prototype, 'findLastIndex', {
      configurable: true,
      writable: true,
      value: function findLastIndex(callback, thisArg) {
        for (var index = this.length - 1; index >= 0; index--) {
          if (index in this && callback.call(thisArg, this[index], index, this)) {
            return index;
          }
        }
        return -1;
      }
    });
  }

  if (typeof String.prototype.at !== 'function') {
    Object.defineProperty(String.prototype, 'at', {
      configurable: true,
      writable: true,
      value: function at(position) {
        var value = String(this);
        var index = Math.trunc(Number(position)) || 0;
        if (index < 0) {
          index += value.length;
        }
        if (index < 0 || index >= value.length) {
          return undefined;
        }
        return value.charAt(index);
      }
    });
  }

  if (typeof String.prototype.replaceAll !== 'function') {
    Object.defineProperty(String.prototype, 'replaceAll', {
      configurable: true,
      writable: true,
      value: function replaceAll(search, replacement) {
        var value = String(this);
        if (search instanceof RegExp) {
          if (!search.global) {
            throw new TypeError('replaceAll must be called with a global RegExp');
          }
          return value.replace(search, replacement);
        }
        var needle = String(search);
        if (needle === '') {
          var output = '';
          var position;
          if (typeof replacement === 'function') {
            for (position = 0; position <= value.length; position++) {
              output += String(replacement(needle, position, value));
              if (position < value.length) {
                output += value.charAt(position);
              }
            }
          } else {
            var text = String(replacement);
            output = text;
            for (position = 0; position < value.length; position++) {
              output += value.charAt(position) + text;
            }
          }
          return output;
        }
        return value.split(needle).join(String(replacement));
      }
    });
  }

  if (typeof String.prototype.matchAll !== 'function') {
    Object.defineProperty(String.prototype, 'matchAll', {
      configurable: true,
      writable: true,
      value: function matchAll(pattern) {
        var input = String(this);
        var regexp = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');
        var flags = regexp.flags || '';
        if (flags.indexOf('g') === -1) {
          flags += 'g';
        }
        var globalRegexp = new RegExp(regexp.source, flags);
        var matches = [];
        // Chrome 68 no soporta Symbol.iterator en arrays? sí lo soporta (ES6).
        var match;
        while ((match = globalRegexp.exec(input)) !== null) {
          matches.push(match);
          if (match[0] === '') {
            globalRegexp.lastIndex += 1;
          }
        }
        return matches[Symbol.iterator]();
      }
    });
  }

  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function fromEntries(entries) {
      var result = {};
      var iterator = entries[Symbol.iterator]();
      for (var step = iterator.next(); !step.done; step = iterator.next()) {
        result[step.value[0]] = step.value[1];
      }
      return result;
    };
  }

  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function hasOwn(object, property) {
      return Object.prototype.hasOwnProperty.call(Object(object), property);
    };
  }

  if (typeof window.queueMicrotask !== 'function') {
    window.queueMicrotask = function queueMicrotask(callback) {
      Promise.resolve().then(callback);
    };
  }

  var toArray = function (iterable) {
    if (Array.isArray(iterable)) {
      return iterable.slice();
    }
    if (typeof Array.from === 'function') {
      return Array.from(iterable);
    }
    return Array.prototype.slice.call(iterable);
  };

  if (typeof Promise.allSettled !== 'function') {
    Promise.allSettled = function allSettled(iterable) {
      var values = toArray(iterable);
      return Promise.all(values.map(function (value) {
        return Promise.resolve(value).then(
          function (result) { return {status: 'fulfilled', value: result}; },
          function (reason) { return {status: 'rejected', reason: reason}; }
        );
      }));
    };
  }

  if (typeof Promise.any !== 'function') {
    Promise.any = function any(iterable) {
      var values = toArray(iterable);
      return new Promise(function (resolve, reject) {
        var remaining = values.length;
        var errors = [];
        if (remaining === 0) {
          reject(new Error('All promises were rejected'));
          return;
        }
        values.forEach(function (value, index) {
          Promise.resolve(value).then(resolve, function (reason) {
            errors[index] = reason;
            remaining -= 1;
            if (remaining === 0) {
              reject(new Error('All promises were rejected'));
            }
          });
        });
      });
    };
  }

  if (typeof window.structuredClone !== 'function') {
    var cloneValue = function (value, seen) {
      if (value === null || typeof value !== 'object') {
        if (typeof value === 'function' || typeof value === 'symbol') {
          throw new TypeError('structuredClone cannot clone this value');
        }
        return value;
      }
      var cached = seen.get(value);
      if (cached !== undefined) {
        return cached;
      }
      if (value instanceof Date) {
        return new Date(value.getTime());
      }
      if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags || '');
      }
      if (typeof ArrayBuffer !== 'undefined') {
        if (value instanceof ArrayBuffer && typeof value.slice === 'function') {
          return value.slice(0);
        }
        if (ArrayBuffer.isView(value)) {
          if (typeof value.slice === 'function') {
            return value.slice(0);
          }
          return new Uint8Array(value.buffer.slice(0));
        }
      }
      var result;
      if (value instanceof Map) {
        result = new Map();
        seen.set(value, result);
        value.forEach(function (entryValue, entryKey) {
          result.set(cloneValue(entryKey, seen), cloneValue(entryValue, seen));
        });
        return result;
      }
      if (value instanceof Set) {
        result = new Set();
        seen.set(value, result);
        value.forEach(function (entryValue) {
          result.add(cloneValue(entryValue, seen));
        });
        return result;
      }
      if (Array.isArray(value)) {
        result = [];
        seen.set(value, result);
        for (var index = 0; index < value.length; index++) {
          result[index] = cloneValue(value[index], seen);
        }
        return result;
      }
      result = {};
      seen.set(value, result);
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          result[key] = cloneValue(value[key], seen);
        }
      }
      return result;
    };
    window.structuredClone = function structuredClone(value) {
      return cloneValue(value, new WeakMap());
    };
  }

  if (typeof Element !== 'undefined') {
    if (typeof Element.prototype.replaceChildren !== 'function') {
      Element.prototype.replaceChildren = function replaceChildren() {
        while (this.firstChild) {
          this.removeChild(this.firstChild);
        }
        for (var index = 0; index < arguments.length; index++) {
          this.appendChild(arguments[index]);
        }
      };
    }
    if (typeof Element.prototype.toggleAttribute !== 'function') {
      Element.prototype.toggleAttribute = function toggleAttribute(name, force) {
        var hasAttribute = this.hasAttribute(name);
        if (force === undefined) {
          force = !hasAttribute;
        }
        if (force) {
          this.setAttribute(name, '');
          return true;
        }
        this.removeAttribute(name);
        return false;
      };
    }
    if (typeof Element.prototype.replaceWith !== 'function') {
      Element.prototype.replaceWith = function replaceWith() {
        if (this.parentNode) {
          var fragment = document.createDocumentFragment();
          for (var index = 0; index < arguments.length; index++) {
            fragment.appendChild(arguments[index]);
          }
          this.parentNode.replaceChild(fragment, this);
        }
      };
    }
  }

  if (typeof HTMLFormElement !== 'undefined' && typeof HTMLFormElement.prototype.requestSubmit !== 'function') {
    HTMLFormElement.prototype.requestSubmit = function requestSubmit(submitter) {
      if (submitter) {
        submitter.click();
        return;
      }
      var event = document.createEvent('Event');
      event.initEvent('submit', true, true);
      if (this.dispatchEvent(event)) {
        this.submit();
      }
    };
  }

  // CanvasRenderingContext2D.roundRect se añadió en Chrome 99. Electronics Lab
  // lo usa para dibujar el multímetro y su montaje aborta con
  // "M.roundRect is not a function" si no existe.
  var installRoundRect = function (proto) {
    if (!proto || typeof proto.roundRect === 'function') {
      return;
    }
    proto.roundRect = function roundRect(x, y, width, height, radii) {
      var corners = [0, 0, 0, 0];
      if (typeof radii === 'number') {
        corners = [radii, radii, radii, radii];
      } else if (radii && typeof radii.length === 'number') {
        if (radii.length === 1) {
          corners = [radii[0], radii[0], radii[0], radii[0]];
        } else if (radii.length === 2) {
          corners = [radii[0], radii[1], radii[0], radii[1]];
        } else if (radii.length === 3) {
          corners = [radii[0], radii[1], radii[2], radii[1]];
        } else if (radii.length >= 4) {
          corners = [radii[0], radii[1], radii[2], radii[3]];
        }
      }
      var left = Math.min(x, x + width);
      var top = Math.min(y, y + height);
      var right = Math.max(x, x + width);
      var bottom = Math.max(y, y + height);
      var limit = Math.min((right - left) / 2, (bottom - top) / 2);
      for (var corner = 0; corner < 4; corner++) {
        corners[corner] = Math.max(0, Math.min(Number(corners[corner]) || 0, limit));
      }
      if (typeof this.moveTo !== 'function') {
        return this;
      }
      this.moveTo(left + corners[0], top);
      this.lineTo(right - corners[1], top);
      if (corners[1] > 0) {
        this.arcTo(right, top, right, top + corners[1], corners[1]);
      }
      this.lineTo(right, bottom - corners[2]);
      if (corners[2] > 0) {
        this.arcTo(right, bottom, right - corners[2], bottom, corners[2]);
      }
      this.lineTo(left + corners[3], bottom);
      if (corners[3] > 0) {
        this.arcTo(left, bottom, left, bottom - corners[3], corners[3]);
      }
      this.lineTo(left, top + corners[0]);
      if (corners[0] > 0) {
        this.arcTo(left, top, left + corners[0], top, corners[0]);
      }
      this.closePath();
      return this;
    };
  };

  if (typeof CanvasRenderingContext2D !== 'undefined') {
    installRoundRect(CanvasRenderingContext2D.prototype);
  }
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    installRoundRect(OffscreenCanvasRenderingContext2D.prototype);
  }
  if (typeof Path2D !== 'undefined') {
    installRoundRect(Path2D.prototype);
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
    try {
      crypto.randomUUID = function randomUUID() {
        var bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        var hex = [];
        for (var index = 0; index < 16; index++) {
          hex.push((bytes[index] + 0x100).toString(16).slice(1));
        }
        return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' +
          hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10, 16).join('');
      };
    } catch (error) {
      // crypto puede ser de sólo lectura en algunos contextos; ignorar.
    }
  }
}());
