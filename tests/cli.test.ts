/**
 * Basic tests for hiliner functionality
 */

import { jest, describe, it, expect } from '@jest/globals';
import { parseLineSpecs } from '../src/parser';
import { highlightLines } from '../src/highlighter';

describe('parseLineSpecs', () => {
  it('should parse line specifications', () => {
    const result = parseLineSpecs(['1', '2-5', '10+3']);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      start: 1,
      end: 1,
      original: '1',
    });
  });
});

describe('highlightLines', () => {
  it('should highlight lines with marker', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const lineSpecs = [{ start: 1, end: 1, original: '1' }];
    const result = highlightLines(content, lineSpecs);
    expect(result).toContain('> Highlighting functionality to be implemented');
    expect(result).toContain(content);
  });
});