import type { Plugin } from 'vite';

/**
 * Vite plugin that injects the Buffer base64url polyfill BEFORE any other code runs.
 *
 * This is critical because:
 * 1. Dependencies like cesr-ts/signify-ts import Buffer at module load time
 * 2. Vite pre-bundles these dependencies
 * 3. If we don't patch Buffer before they load, they get an unpatched reference
 *
 * This plugin injects the polyfill code directly into index.html as an inline script
 * that runs before any module imports.
 */
export function bufferBase64urlPolyfillPlugin(): Plugin {
  return {
    name: 'buffer-base64url-polyfill',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Inline polyfill code that patches Buffer.prototype.toString
        // NOTE: NOT type="module" - this must run immediately, not deferred
        const polyfillScript = `
<script>
  // Buffer base64url polyfill - MUST run before any modules import Buffer

  // Wait for Buffer to be available, then patch it
  function patchBuffer(BufferConstructor) {
    if (!BufferConstructor) {
      return;
    }

    if (BufferConstructor.prototype.__base64urlPatched) {
      return; // Already patched
    }

    const originalToString = BufferConstructor.prototype.toString;
    BufferConstructor.prototype.toString = function(encoding, start, end) {
      if (encoding === 'base64url') {
        const slice = this.slice(start ?? 0, end ?? this.length);
        const base64 = originalToString.call(slice, 'base64');
        return base64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
      }
      return originalToString.call(this, encoding, start, end);
    };

    const originalFrom = BufferConstructor.from;
    BufferConstructor.from = function(value, encodingOrOffset, length) {
      if (encodingOrOffset === 'base64url' && typeof value === 'string') {
        let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        return originalFrom.call(BufferConstructor, base64 + padding, 'base64');
      }
      return originalFrom.call(BufferConstructor, value, encodingOrOffset, length);
    };

    BufferConstructor.prototype.__base64urlPatched = true;
  }

  // Patch immediately if Buffer exists
  if (globalThis.Buffer) {
    patchBuffer(globalThis.Buffer);
  }

  // Watch for Buffer being set later and patch it
  let _Buffer = globalThis.Buffer;
  Object.defineProperty(globalThis, 'Buffer', {
    get() { return _Buffer; },
    set(newBuffer) {
      _Buffer = newBuffer;
      if (newBuffer && !newBuffer.prototype.__base64urlPatched) {
        patchBuffer(newBuffer);
      }
    },
    configurable: true
  });

  // Also wait for DOMContentLoaded and check again
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (globalThis.Buffer && !globalThis.Buffer.prototype.__base64urlPatched) {
        patchBuffer(globalThis.Buffer);
      }
    });
  }
</script>
`;

        // Inject before the first <script> tag
        return html.replace('<head>', `<head>${polyfillScript}`);
      },
    },
  };
}
