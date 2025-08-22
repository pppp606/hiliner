import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { FileContentProps } from '../types.js';

interface OptimizedFileDisplayProps {
  lines: string[];
  startLineNumber: number;
  highlightIndex: number | null;
  lineNumberWidth: number;
  showLineNumbers: boolean;
  horizontalOffset: number;
  maxWidth?: number;
  selectedLines?: Set<number>;
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
  selectedLines
}: OptimizedFileDisplayProps) => {
  // Build the entire display as a single string to minimize DOM updates
  const displayContent = lines.map((line, index) => {
    const actualLineNumber = startLineNumber + index;
    const isCurrentLine = highlightIndex === index + 1;
    
    // Apply horizontal offset and max width
    let displayLine = line || '';
    if (horizontalOffset > 0) {
      displayLine = displayLine.slice(horizontalOffset);
    }
    if (maxWidth && displayLine.length > maxWidth) {
      displayLine = displayLine.slice(0, maxWidth - 3) + '...';
    }
    
    if (showLineNumbers) {
      const lineNumberStr = actualLineNumber.toString().padStart(lineNumberWidth - 1, ' ');
      
      // Determine prefix based on selection and cursor state
      // Visual indicators:
      // '▶ ' = cursor/highlighted line
      // ' *' = selected line 
      // '▶*' = highlighted AND selected line
      // '  ' = normal line
      const isSelected = selectedLines?.has(actualLineNumber) || false;
      let prefix: string;
      
      if (isCurrentLine && isSelected) {
        prefix = '▶*'; // Both cursor and selection
      } else if (isCurrentLine) {
        prefix = '▶ '; // Cursor only
      } else if (isSelected) {
        prefix = ' *'; // Selection only  
      } else {
        prefix = '  '; // Normal line
      }
      
      return `${prefix}${lineNumberStr} ${displayLine}`;
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
      />
    </Box>
  );
}

export const FileContent = memo(FileContentComponent);