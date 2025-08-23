// Test setup for language detection tests
// Provides Node.js environment polyfills for jsdom

import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jsdom environment
if (typeof global !== 'undefined') {
  global.TextEncoder = TextEncoder as any;
  global.TextDecoder = TextDecoder as any;
}

// Mock console.warn to avoid noise in tests unless explicitly testing error cases
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Only show warnings that are not from language detection failures
  if (!args[0]?.toString().includes('Language detection from content failed')) {
    originalWarn(...args);
  }
};