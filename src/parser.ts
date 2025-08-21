/**
 * Line specification parsing functionality
 */

import { type LineSpec } from './types.js';

/**
 * Parse line specification strings into LineSpec objects
 * @param specs - Array of line specification strings (e.g., ["1", "5-10", "15+3"])
 * @returns Array of parsed LineSpec objects
 */
export function parseLineSpecs(specs: string[]): LineSpec[] {
  // TODO: Implement line specification parsing logic
  // This is a placeholder implementation
  return specs.map(spec => ({
    start: 1,
    end: 1,
    original: spec,
  }));
}
