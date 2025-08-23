import React, { memo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { FileContent } from './FileContent.js';
import type { FileData, FileViewerProps } from '../types.js';

function FileViewerComponent({ 
  fileData, 
  scrollPosition = 0,
  cursorPosition = 0,
  selectedLines
}: FileViewerProps): React.ReactElement {
  const { stdout } = useStdout();

  // Calculate viewport settings - prevent flickering in iTerm2
  const viewportHeight = Math.max(10, (stdout?.rows || 24) - 2); // -2 for status bar + iTerm2 compatibility

  // Handle null or malformed fileData
  if (!fileData || !fileData.lines) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        No file data available
      </Box>
    );
  }

  // Handle empty content
  if (fileData.totalLines === 0 || fileData.lines.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text>File is empty</Text>
      </Box>
    );
  }

  const startLine = Math.max(0, scrollPosition);
  const endLine = Math.min(fileData.lines.length, startLine + viewportHeight);
  
  // Get visible lines
  const visibleLines = fileData.lines.slice(startLine, endLine);

  return (
    <Box flexGrow={1} flexDirection="column">
      <FileContent 
        lines={visibleLines}
        showLineNumbers={true}
        startLineNumber={startLine + 1}
        scrollOffset={0}
        viewportHeight={viewportHeight}
        highlightLine={cursorPosition - startLine + 1}
        horizontalOffset={0}
        selectedLines={selectedLines}
        enableSyntaxHighlighting={true}
        language={fileData.metadata?.detectedLanguage}
      />
    </Box>
  );
}

export const FileViewer = memo(FileViewerComponent);