import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { FileContent } from './FileContent.js';

interface FileData {
  content: string;
  lines: string[];
  totalLines: number;
  filePath: string;
}

interface FileViewerProps {
  fileData: FileData | null;
  scrollPosition?: number;
  onScrollChange?: (position: number) => void;
  isFocused?: boolean;
}

export function FileViewer({ 
  fileData, 
  scrollPosition = 0,
  onScrollChange,
  isFocused = true
}: FileViewerProps): React.ReactElement {
  const [localScrollPosition, setLocalScrollPosition] = useState(0);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  // Use provided scroll position or local state
  const currentScrollPosition = scrollPosition ?? localScrollPosition;

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

  // Handle keyboard input when focused
  useInput((input: string, key: Key) => {
    if (!isFocused) return;

    const maxScroll = Math.max(0, fileData.lines.length - 1);
    let newScrollPosition = currentScrollPosition;

    // Vertical navigation
    if (key.downArrow) {
      newScrollPosition = Math.min(maxScroll, currentScrollPosition + 1);
    } else if (key.upArrow) {
      newScrollPosition = Math.max(0, currentScrollPosition - 1);
    } else if (input === ' ') {
      // Page down (space)
      newScrollPosition = Math.min(maxScroll, currentScrollPosition + 10);
    } else if (input === 'b') {
      // Page up (b)
      newScrollPosition = Math.max(0, currentScrollPosition - 10);
    } else if (input === 'G') {
      // Go to end
      newScrollPosition = maxScroll;
    } else if (input === 'g') {
      // Go to start (gg in vim-like editors)
      newScrollPosition = 0;
    }

    // Horizontal navigation
    if (key.rightArrow) {
      setHorizontalOffset(Math.max(0, horizontalOffset + 1));
    } else if (key.leftArrow) {
      setHorizontalOffset(Math.max(0, horizontalOffset - 1));
    }

    // Update scroll position if it changed
    if (newScrollPosition !== currentScrollPosition) {
      if (onScrollChange) {
        onScrollChange(newScrollPosition);
      } else {
        setLocalScrollPosition(newScrollPosition);
      }
    }
  }, { isActive: isFocused });

  // Calculate viewport settings
  const viewportHeight = 20; // Default viewport height
  const startLine = Math.max(0, currentScrollPosition);
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
        currentLine={currentScrollPosition + 1}
        horizontalOffset={horizontalOffset}
      />
    </Box>
  );
}