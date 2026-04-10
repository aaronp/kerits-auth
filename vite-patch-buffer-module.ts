import type { Plugin } from 'vite';

/**
 * Vite plugin that patches the buffer module by transforming its code
 *
 * This intercepts the buffer module from node_modules/buffer and injects
 * base64url support directly into the module code before it's loaded.
 */
export function patchBufferModulePlugin(): Plugin {
  return {
    name: 'patch-buffer-module',
    enforce: 'pre',

    transform(code, id) {
      // Only transform the buffer module from vite-plugin-node-polyfills or node_modules
      const isBufferModule = id.includes('/buffer/') && id.includes('index.js');

      if (!isBufferModule) {
        return null;
      }

      // Append base64url polyfill to the buffer module
      const patchedCode =
        code +
        `
// === base64url polyfill ===
(function() {
  if (Buffer.prototype.__base64urlPatched) return;

  const origToString = Buffer.prototype.toString;
  Buffer.prototype.toString = function(enc, start, end) {
    if (enc === 'base64url') {
      const b64 = origToString.call(this, 'base64', start, end);
      return b64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
    }
    return origToString.call(this, enc, start, end);
  };

  const origFrom = Buffer.from;
  Buffer.from = function(val, enc, len) {
    if (enc === 'base64url' && typeof val === 'string') {
      let b64 = val.replace(/-/g, '+').replace(/_/g, '/');
      b64 += '='.repeat((4 - (b64.length % 4)) % 4);
      return origFrom.call(this, b64, 'base64');
    }
    return origFrom.call(this, val, enc, len);
  };

  Buffer.prototype.__base64urlPatched = true;
})();
`;

      return {
        code: patchedCode,
        map: null,
      };
    },
  };
}
