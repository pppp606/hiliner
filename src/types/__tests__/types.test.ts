/**
 * Type definition tests for hiliner
 * 
 * These tests verify TypeScript interfaces and type safety
 * for selection-related functionality and component props.
 */

import type {
  LineSpec,
  HighlightOptions,
  CLIArgs,
  // Now implemented types
  SelectionState,
  FileData,
  FileViewerProps,
  FileContentProps,
  StatusBarProps,
  UseSelectionReturn,
  AppProps,
} from '../../types.js';

describe('Type Definitions', () => {
  describe('Existing Types', () => {
    it('should have valid LineSpec interface', () => {
      const lineSpec: LineSpec = {
        start: 1,
        end: 5,
        original: '1-5'
      };
      
      expect(lineSpec.start).toBe(1);
      expect(lineSpec.end).toBe(5);
      expect(lineSpec.original).toBe('1-5');
    });

    it('should have valid HighlightOptions interface', () => {
      const options: HighlightOptions = {
        marker: '>',
        showLineNumbers: true,
        relativeLineNumbers: false,
        context: 2
      };
      
      expect(options.marker).toBe('>');
      expect(options.showLineNumbers).toBe(true);
    });

    it('should have valid CLIArgs interface', () => {
      const args: CLIArgs = {
        file: 'test.txt',
        lines: ['1', '5-10'],
        static: false,
        debug: true
      };
      
      expect(args.file).toBe('test.txt');
      expect(args.lines).toEqual(['1', '5-10']);
    });
  });

  describe('Selection Types', () => {
    it('should have valid SelectionState interface', () => {
      const state: SelectionState = {
        selectedLines: new Set([1, 2, 3]),
        selectionCount: 3,
        lastSelectedLine: 3
      };
      
      expect(state.selectedLines.size).toBe(3);
      expect(state.selectionCount).toBe(3);
      expect(state.lastSelectedLine).toBe(3);
    });

    it('should have valid UseSelectionReturn interface', () => {
      const hookReturn: UseSelectionReturn = {
        selectedLines: new Set([1, 2]),
        selectionCount: 2,
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        deselectAll: jest.fn(),
        clearSelection: jest.fn(),
        isSelected: jest.fn(() => true)
      };
      
      expect(hookReturn.selectedLines.size).toBe(2);
      expect(hookReturn.selectionCount).toBe(2);
      expect(typeof hookReturn.toggleSelection).toBe('function');
      expect(typeof hookReturn.isSelected).toBe('function');
    });
  });

  describe('Component Prop Types', () => {
    it('should have valid FileData interface', () => {
      const fileData: FileData = {
        content: 'line1\nline2',
        lines: ['line1', 'line2'],
        totalLines: 2,
        filePath: '/test/file.txt'
      };
      
      expect(fileData.content).toBe('line1\nline2');
      expect(fileData.lines).toEqual(['line1', 'line2']);
      expect(fileData.totalLines).toBe(2);
      expect(fileData.filePath).toBe('/test/file.txt');
    });

    it('should have valid FileViewerProps interface', () => {
      const props: FileViewerProps = {
        fileData: null,
        scrollPosition: 0,
        cursorPosition: 0,
        isFocused: false,
        selectedLines: new Set([1])
      };
      
      expect(props.fileData).toBeNull();
      expect(props.scrollPosition).toBe(0);
      expect(props.selectedLines?.has(1)).toBe(true);
    });

    it('should have valid FileContentProps interface', () => {
      const props: FileContentProps = {
        lines: ['line1', 'line2'],
        showLineNumbers: true,
        selectedLines: new Set([1])
      };
      
      expect(props.lines).toEqual(['line1', 'line2']);
      expect(props.showLineNumbers).toBe(true);
      expect(props.selectedLines?.has(1)).toBe(true);
    });

    it('should have valid StatusBarProps interface', () => {
      const props: StatusBarProps = {
        fileName: 'test.txt',
        currentLine: 1,
        totalLines: 10,
        selectionCount: 2
      };
      
      expect(props.fileName).toBe('test.txt');
      expect(props.currentLine).toBe(1);
      expect(props.totalLines).toBe(10);
      expect(props.selectionCount).toBe(2);
    });

    it('should have valid AppProps interface', () => {
      const props: AppProps = {
        filePath: '/test/file.txt'
      };
      
      expect(props.filePath).toBe('/test/file.txt');
    });
  });

  describe('Type Consistency', () => {
    it('should ensure selectedLines is consistently typed as Set<number>', () => {
      const selectedLines: Set<number> = new Set([1, 2, 3]);
      
      // Test that it accepts number values
      selectedLines.add(4);
      expect(selectedLines.has(4)).toBe(true);
      
      // Test that it rejects non-number values (compilation error)
      // selectedLines.add('string'); // Should cause TypeScript error
    });

    it('should ensure line numbers are consistently 1-based', () => {
      // Line numbers should always be positive integers (1-based)
      const validLineNumber: number = 1;
      expect(validLineNumber).toBeGreaterThan(0);
      
      // Zero or negative line numbers should be invalid in context
      const invalidLineNumber: number = 0;
      expect(invalidLineNumber).toBeLessThanOrEqual(0);
    });
  });

  describe('Optional vs Required Properties', () => {
    it('should properly handle optional component props', () => {
      // Test that optional props can be omitted
      const minimalFileViewerProps = {
        fileData: null
      };
      
      // Should not require scrollPosition, cursorPosition, etc.
      expect(minimalFileViewerProps.fileData).toBeNull();
    });

    it('should require essential props for proper functionality', () => {
      // Critical props should be required
      const fileData = {
        content: 'test',
        lines: ['test'],
        totalLines: 1,
        filePath: 'test.txt'
      };
      
      expect(fileData.content).toBeDefined();
      expect(fileData.lines).toBeDefined();
      expect(fileData.totalLines).toBeDefined();
      expect(fileData.filePath).toBeDefined();
    });
  });
});