import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdout, type Key } from 'ink';
import { useFileLoader } from '../hooks/useFileLoader.js';
import { useSelection } from '../hooks/useSelection.js';
import { FileViewer } from './FileViewer.js';
import { StatusBar } from './StatusBar.js';
import type { AppProps } from '../types.js';

export function App({ filePath, theme = 'dark-plus' }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalHeight = Math.max(10, (stdout?.rows || 24) - 1); // -1 to prevent flickering in iTerm2 when content exceeds screen height
  
  
  // File loading state
  const { loading, error, content, metadata, loadFile } = useFileLoader({
    autoLoad: false, // Disable autoLoad to avoid conflicts
    initialFilePath: filePath,
  });

  // Multi-selection state
  const { 
    selectedLines, 
    selectionCount, 
    toggleSelection, 
    selectAll, 
    clearSelection, 
    isSelected 
  } = useSelection();

  // UI state
  const [scrollPosition, setScrollPosition] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);  // Actual cursor position in file
  const [columnPosition, setColumnPosition] = useState(0);
  const [rangeSelectionStart, setRangeSelectionStart] = useState<number | null>(null);
  
  // Throttling for rapid key presses
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if file has been loaded to prevent duplicate calls
  const [hasLoadedFile, setHasLoadedFile] = useState(false);

  // Load file when filePath changes
  useEffect(() => {
    if (filePath && !hasLoadedFile) {
      setHasLoadedFile(true);
      loadFile(filePath);
    }
  }, [filePath, loadFile, hasLoadedFile]);

  // Clear selections when file content changes
  useEffect(() => {
    clearSelection();
  }, [content, clearSelection]);


  // Calculate viewport height for scrolling logic
  const viewportHeight = Math.max(10, terminalHeight - 1);  // -1 for status bar (height already reduced for iTerm2 compatibility)
  
  // Handle keyboard input with throttling
  useInput((input: string, key: Key) => {
    // Handle quit commands immediately
    if (input === 'q' || key.ctrl && input === 'c') {
      exit();
      return;
    }

    // Multi-selection keyboard shortcuts (work when file is loaded)
    if (content && content.length > 0) {
      // Shift+Tab: Range selection
      if (key.tab && key.shift) {
        if (rangeSelectionStart === null) {
          // No range start set, just toggle current line and mark as start
          toggleSelection(cursorPosition + 1);
          setRangeSelectionStart(cursorPosition + 1);
        } else {
          // Range selection from start to current position
          const start = Math.min(rangeSelectionStart, cursorPosition + 1);
          const end = Math.max(rangeSelectionStart, cursorPosition + 1);
          selectAll(start, end);
          setRangeSelectionStart(null); // Clear range selection
        }
        return;
      }
      
      // Tab: Toggle selection of current line (or start range selection)
      if (key.tab) {
        toggleSelection(cursorPosition + 1); // Convert 0-based to 1-based line number
        setRangeSelectionStart(cursorPosition + 1); // Mark as potential range start
        return;
      }

      // 'a': Select all visible lines (within current viewport)
      if (input === 'a') {
        const startLine = Math.max(1, scrollPosition + 1); // 1-based line numbering
        const endLine = Math.min(content.length, scrollPosition + viewportHeight);
        selectAll(startLine, endLine);
        return;
      }

      // 'd': Deselect all lines
      if (input === 'd') {
        clearSelection();
        setRangeSelectionStart(null);
        return;
      }

      // Escape: Clear all selections (same as 'd')
      if (key.escape) {
        clearSelection();
        setRangeSelectionStart(null);
        return;
      }
    }

    // Navigation when file is loaded
    if (content && content.length > 0) {
      const maxLine = Math.max(0, content.length - 1);
      let newCursorPos = cursorPosition;
      let newScrollPos = scrollPosition;
      
      // Vertical navigation
      if (key.upArrow) {
        newCursorPos = Math.max(0, cursorPosition - 1);
      } else if (key.downArrow) {
        newCursorPos = Math.min(maxLine, cursorPosition + 1);
      } else if (input === ' ' || key.pageDown) {
        // Page down
        const pageSize = Math.max(1, viewportHeight - 1);
        newCursorPos = Math.min(maxLine, cursorPosition + pageSize);
      } else if (input === 'b' || key.pageUp) {
        // Page up
        const pageSize = Math.max(1, viewportHeight - 1);
        newCursorPos = Math.max(0, cursorPosition - pageSize);
      } else if (input === 'g') {
        // Go to start
        newCursorPos = 0;
      } else if (input === 'G') {
        // Go to end
        newCursorPos = maxLine;
      }
      
      // Update scroll position to keep cursor in viewport
      if (newCursorPos !== cursorPosition) {
        // If cursor would go above viewport, scroll up
        if (newCursorPos < newScrollPos) {
          newScrollPos = newCursorPos;
        }
        // If cursor would go below viewport, scroll down
        else if (newCursorPos >= newScrollPos + viewportHeight) {
          newScrollPos = newCursorPos - viewportHeight + 1;
        }
        
        // Clear any pending update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Immediate update for better responsiveness
        setCursorPosition(newCursorPos);
        setScrollPosition(newScrollPos);
      }
      
      // Horizontal navigation
      if (key.leftArrow) {
        setColumnPosition(Math.max(0, columnPosition - 1));
      } else if (key.rightArrow) {
        setColumnPosition(columnPosition + 1);
      }
    }
  });

  // Handle scroll position changes
  const handleScrollChange = useCallback((newPosition: number) => {
    setScrollPosition(newPosition);
  }, []);

  // No file provided
  if (!filePath) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          No file provided
        </Box>
        <StatusBar />
      </Box>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>Loading...</Text>
        </Box>
        <StatusBar fileName={filePath.split('/').pop() || ''} isLoading={true} />
      </Box>
    );
  }

  // Error state
  if (error) {
    const errorMessage = error.message || 'Error loading file';
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>
            {errorMessage.includes('not found') ? 'File not found' : 
             errorMessage.includes('cannot be loaded') ? 'File cannot be loaded' : 
             `Error: ${errorMessage}`}
          </Text>
        </Box>
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
          isError={true} 
          errorMessage={errorMessage}
        />
      </Box>
    );
  }

  // Empty file
  if (content.length === 0) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>File is empty</Text>
        </Box>
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
        />
      </Box>
    );
  }

  // Binary file check
  const isBinaryFile = filePath.endsWith('.bin') || filePath.endsWith('.exe') || 
                      filePath.endsWith('.jpg') || filePath.endsWith('.png') ||
                      metadata?.isBinary;
  
  if (isBinaryFile) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>Binary file - cannot display content</Text>
        </Box>
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
          isBinary={true}
        />
      </Box>
    );
  }

  // Prepare file data for FileViewer
  const fileData = {
    content: content.join('\n'),
    lines: content,
    totalLines: content.length,
    filePath: filePath,
    metadata: metadata || undefined
  };

  // Normal file display
  return (
    <Box flexDirection="column" height={terminalHeight}>
      <FileViewer 
        fileData={fileData}
        scrollPosition={scrollPosition}
        cursorPosition={cursorPosition}
        onScrollChange={handleScrollChange}
        isFocused={true}
        selectedLines={selectedLines}
        theme={theme}
      />
      <StatusBar 
        fileName={filePath.split('/').pop() || ''}
        currentLine={cursorPosition + 1}
        totalLines={content.length}
        selectionCount={selectionCount}
        detectedLanguage={metadata?.detectedLanguage}
        syntaxHighlightingEnabled={true}
        syntaxTheme={theme}
        encoding={metadata?.encoding}
        theme={theme}
      />
    </Box>
  );
}