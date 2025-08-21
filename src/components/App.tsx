import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, type Key } from 'ink';
import { useFileLoader } from '../hooks/useFileLoader.js';
import { Header } from './Header.js';
import { FileViewer } from './FileViewer.js';
import { StatusBar } from './StatusBar.js';
import { HelpScreen } from './HelpScreen.js';

interface AppProps {
  filePath?: string;
}

export function App({ filePath }: AppProps): React.ReactElement {
  const { exit } = useApp();
  
  // File loading state
  const { loading, error, content, metadata, loadFile } = useFileLoader({
    autoLoad: false, // Disable autoLoad to avoid conflicts
    initialFilePath: filePath,
  });

  // UI state
  const [scrollPosition, setScrollPosition] = useState(0);
  const [columnPosition, setColumnPosition] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  // Track if file has been loaded to prevent duplicate calls
  const [hasLoadedFile, setHasLoadedFile] = useState(false);

  // Load file when filePath changes
  useEffect(() => {
    if (filePath && !hasLoadedFile) {
      setHasLoadedFile(true);
      loadFile(filePath);
    }
  }, [filePath, loadFile, hasLoadedFile]);

  // Handle keyboard input
  useInput((input: string, key: Key) => {
    // Help screen gets priority for input handling
    if (showHelp) {
      if (key.escape || input === '?' || input === 'h' || input === 'q') {
        setShowHelp(false);
      }
      return; // Don't process other keys when help is shown
    }

    // Handle quit commands
    if (input === 'q' || key.ctrl && input === 'c') {
      exit();
      return;
    }

    // Show help
    if (input === '?' || input === 'h') {
      setShowHelp(true);
      return;
    }

    // Navigation when file is loaded
    if (content && content.length > 0) {
      const maxScroll = Math.max(0, content.length - 1);
      
      // Vertical navigation
      if (key.upArrow) {
        setScrollPosition(Math.max(0, scrollPosition - 1));
      } else if (key.downArrow) {
        setScrollPosition(Math.min(maxScroll, scrollPosition + 1));
      } else if (input === ' ' || key.pageDown) {
        // Page down
        setScrollPosition(Math.min(maxScroll, scrollPosition + 10));
      } else if (input === 'b' || key.pageUp) {
        // Page up
        setScrollPosition(Math.max(0, scrollPosition - 10));
      } else if (input === 'g') {
        // Go to start
        setScrollPosition(0);
      } else if (input === 'G') {
        // Go to end
        setScrollPosition(maxScroll);
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

  // Render help screen overlay
  if (showHelp) {
    return (
      <HelpScreen 
        isVisible={true} 
        onClose={() => setShowHelp(false)}
        title="Hiliner"
        version="0.1.0"
      />
    );
  }

  // No file provided
  if (!filePath) {
    return (
      <Box flexDirection="column">
        <Header />
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
      <Box flexDirection="column">
        <Header filePath={filePath} isLoading={true} />
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
      <Box flexDirection="column">
        <Header filePath={filePath} isError={true} errorMessage={errorMessage} />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          {errorMessage.includes('not found') ? 'File not found' : 
           errorMessage.includes('cannot be loaded') ? 'File cannot be loaded' : 
           `Error: ${errorMessage}`}
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
      <Box flexDirection="column">
        <Header 
          filePath={filePath}
          totalLines={0}
          fileSize={metadata?.size ? `${metadata.size} bytes` : undefined}
        />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>File is empty</Text>
        </Box>
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
          currentLine={0}
          totalLines={0}
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
      <Box flexDirection="column">
        <Header 
          filePath={filePath}
          isBinary={true}
          fileSize={metadata?.size ? `${metadata.size} bytes` : undefined}
        />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          Binary file - cannot display content
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
    filePath: filePath
  };

  // Normal file display
  return (
    <Box flexDirection="column">
      <Header 
        filePath={filePath}
        totalLines={content.length}
        currentLine={scrollPosition + 1}
        currentColumn={columnPosition + 1}
        fileSize={metadata?.size ? `${metadata.size} bytes` : undefined}
      />
      <FileViewer 
        fileData={fileData}
        scrollPosition={scrollPosition}
        onScrollChange={handleScrollChange}
        isFocused={true}
      />
      <StatusBar 
        fileName={filePath.split('/').pop() || ''}
        currentLine={scrollPosition + 1}
        totalLines={content.length}
        currentColumn={columnPosition + 1}
      />
    </Box>
  );
}