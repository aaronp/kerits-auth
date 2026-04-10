/**
 * Buffer base64url polyfill — must be imported FIRST in main.tsx
 * before any code that uses cesr-ts / signify-ts.
 */
import { Buffer } from 'node:buffer';

const originalToString = Buffer.prototype.toString;
const originalFrom = Buffer.from;

if (!(Buffer.prototype as any).__base64urlPatched) {
  Buffer.prototype.toString = function (encoding?: any, start?: number, end?: number): string {
    if (encoding === 'base64url') {
      const slice = this.slice(start ?? 0, end ?? this.length);
      const base64 = originalToString.call(slice, 'base64');
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    return originalToString.call(this, encoding, start, end);
  };

  (Buffer as any).from = (value: any, encodingOrOffset?: any, length?: number): Buffer => {
    if (encodingOrOffset === 'base64url' && typeof value === 'string') {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      return originalFrom.call(Buffer, base64 + padding, 'base64');
    }
    return originalFrom.call(Buffer, value, encodingOrOffset, length);
  };

  (Buffer.prototype as any).__base64urlPatched = true;
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
