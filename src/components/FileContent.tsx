import React from 'react';
import { Box, Text } from 'ink';

interface FileContentProps {
  lines: string[] | null;
  showLineNumbers?: boolean;
  startLineNumber?: number;
  scrollOffset?: number;
  viewportHeight?: number;
  currentLine?: number;
  highlightedLines?: number[];
  enableSyntaxHighlighting?: boolean;
  language?: string;
  maxWidth?: number;
  horizontalOffset?: number;
  theme?: string;
  fontSize?: string;
  onLineClick?: (lineNumber: number) => void;
}

export function FileContent({
  lines,
  showLineNumbers = true,
  startLineNumber = 1,
  scrollOffset = 0,
  viewportHeight,
  currentLine,
  highlightedLines = [],
  enableSyntaxHighlighting = false,
  language,
  maxWidth,
  horizontalOffset = 0,
  theme,
  fontSize,
  onLineClick
}: FileContentProps): React.ReactElement {
  
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

  // Render each line
  return (
    <Box flexDirection="column" flexGrow={1}>
      {visibleLines.map((line, index) => {
        const actualLineNumber = startLineNumber + effectiveScrollOffset + index;
        const isCurrentLine = currentLine === actualLineNumber;
        const isHighlighted = highlightedLines.includes(actualLineNumber);

        // Apply horizontal offset
        let displayLine = line || '';
        if (horizontalOffset > 0) {
          displayLine = displayLine.slice(horizontalOffset);
        }

        // Apply max width constraint
        if (maxWidth && displayLine.length > maxWidth) {
          displayLine = displayLine.slice(0, maxWidth - 3) + '...';
        }

        // Format line number
        const lineNumberText = showLineNumbers 
          ? actualLineNumber.toString().padStart(lineNumberWidth - 1, ' ') + ' '
          : '';

        return (
          <Box key={`line-${actualLineNumber}`}>
            {showLineNumbers && (
              <Text color="dim">
                {lineNumberText}
              </Text>
            )}
            <Text 
              backgroundColor={isCurrentLine ? 'blue' : undefined}
              color={isHighlighted ? 'yellow' : undefined}
            >
              {displayLine}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}