import React, { memo, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { FileContentProps } from '../types.js';
import { chalkColors } from '../utils/colors.js';
import { useSyntaxHighlighting } from '../hooks/useSyntaxHighlighting.js';

interface OptimizedFileDisplayProps {
  lines: string[];
  startLineNumber: number;
  highlightIndex: number | null;
  lineNumberWidth: number;
  showLineNumbers: boolean;
  horizontalOffset: number;
  maxWidth?: number;
  selectedLines?: Set<number>;
  highlightedLines?: string[];
  enableSyntaxHighlighting?: boolean;
}

// Single component with minimal re-rendering
// Maintains performance by rendering all content as a single text block
const OptimizedFileDisplay = memo(({
  lines,
  startLineNumber,
  highlightIndex,
  lineNumberWidth,
  showLineNumbers,
  horizontalOffset,
  maxWidth,
  selectedLines,
  highlightedLines,
  enableSyntaxHighlighting
}: OptimizedFileDisplayProps) => {
  // Build the entire display as a single string to minimize DOM updates
  const displayContent = lines.map((line, index) => {
    const actualLineNumber = startLineNumber + index;
    const isCurrentLine = highlightIndex === index + 1;
    
    // Use highlighted line if syntax highlighting is enabled and available
    let displayLine = '';
    if (enableSyntaxHighlighting && highlightedLines && highlightedLines[index]) {
      displayLine = highlightedLines[index];
    } else {
      displayLine = line || '';
    }
    
    // Apply horizontal offset and max width
    if (horizontalOffset > 0) {
      displayLine = displayLine.slice(horizontalOffset);
    }
    if (maxWidth && displayLine.length > maxWidth) {
      displayLine = displayLine.slice(0, maxWidth - 3) + '...';
    }
    
    if (showLineNumbers) {
      const lineNumberStr = actualLineNumber.toString().padStart(lineNumberWidth, ' ');
      
      // Determine visual styling based on selection and cursor state
      const isSelected = selectedLines?.has(actualLineNumber) || false;
      
      // Cursor indicator
      const cursorIndicator = isCurrentLine ? '▶' : ' ';
      
      // Apply color to line number if selected
      const styledLineNumber = isSelected 
        ? chalkColors.selectedLineNumber(lineNumberStr)
        : lineNumberStr;
      
      // Build the complete line
      return `${cursorIndicator}${styledLineNumber} ${displayLine}`;
    } else {
      return displayLine;
    }
  }).join('\n');
  
  return <Text>{displayContent}</Text>;
});


function FileContentComponent({
  lines,
  showLineNumbers = true,
  startLineNumber = 1,
  scrollOffset = 0,
  viewportHeight,
  highlightLine,
  selectedLines,
  maxWidth,
  horizontalOffset = 0,
  enableSyntaxHighlighting = true,
  language,
  theme = 'dark-plus',
}: FileContentProps): React.ReactElement {
  // Initialize syntax highlighting hook
  const syntaxHighlighting = useSyntaxHighlighting({
    enabled: enableSyntaxHighlighting,
    theme: theme || 'dark-plus',
  });

  // State for highlighted lines
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  
  // Effect to highlight visible lines when content changes
  useEffect(() => {
    if (!enableSyntaxHighlighting || !lines || !Array.isArray(lines) || lines.length === 0) {
      setHighlightedLines([]);
      return;
    }

    // Apply scroll offset and viewport height to get visible lines
    const effectiveScrollOffset = Math.max(0, scrollOffset);
    let visibleLines = lines.slice(effectiveScrollOffset);
    
    if (viewportHeight && viewportHeight > 0) {
      visibleLines = visibleLines.slice(0, viewportHeight);
    }

    // Highlight visible lines
    const highlightVisibleLines = async () => {
      try {
        const highlighted = await syntaxHighlighting.highlightLines(
          visibleLines,
          // Generate a pseudo file path for language detection if language is not provided
          language ? `file.${getFileExtensionForLanguage(language)}` : undefined
        );
        setHighlightedLines(highlighted);
      } catch (error) {
        console.warn('Failed to highlight lines:', error);
        setHighlightedLines([]);
      }
    };

    highlightVisibleLines();
  }, [lines, scrollOffset, viewportHeight, enableSyntaxHighlighting, language, theme, syntaxHighlighting]);

  // Helper function to map language to file extension for detection
  const getFileExtensionForLanguage = (lang: string): string => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      yaml: 'yml',
      markdown: 'md',
      bash: 'sh',
      powershell: 'ps1',
    };
    return extensionMap[lang] || 'txt';
  };
  
  // Handle null/undefined lines
  if (!lines || !Array.isArray(lines)) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text>No content to display</Text>
      </Box>
    );
  }

  // Handle empty lines array
  if (lines.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text>No content available</Text>
      </Box>
    );
  }

  // Apply scroll offset and viewport height
  const effectiveScrollOffset = Math.max(0, scrollOffset);
  let visibleLines = lines.slice(effectiveScrollOffset);
  
  if (viewportHeight && viewportHeight > 0) {
    visibleLines = visibleLines.slice(0, viewportHeight);
  }

  // Calculate line number width for consistent formatting
  const maxLineNumber = startLineNumber + visibleLines.length - 1;
  const lineNumberWidth = Math.max(3, maxLineNumber.toString().length + 1);

  // Use the optimized single-component approach
  return (
    <Box flexGrow={1}>
      <OptimizedFileDisplay 
        lines={visibleLines}
        startLineNumber={startLineNumber + effectiveScrollOffset}
        highlightIndex={highlightLine || null}
        lineNumberWidth={lineNumberWidth}
        showLineNumbers={showLineNumbers}
        horizontalOffset={horizontalOffset}
        maxWidth={maxWidth}
        selectedLines={selectedLines}
        highlightedLines={highlightedLines}
        enableSyntaxHighlighting={enableSyntaxHighlighting}
      />
    </Box>
  );
}

export const FileContent = memo(FileContentComponent);