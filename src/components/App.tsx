import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdout, type Key } from 'ink';
import { useFileLoader } from '../hooks/useFileLoader.js';
import { useSelection } from '../hooks/useSelection.js';
import { FileViewer } from './FileViewer.js';
import { StatusBar } from './StatusBar.js';
import type { AppProps, FileData, SelectionState } from '../types.js';
import { createActionRegistry, ActionRegistry } from '../utils/actionRegistry.js';
import { buildActionContext, type ActionContext } from '../utils/actionContext.js';
import { ActionExecutor, createBuiltinHandler } from '../utils/actionExecutor.js';
import type { ActionExecutionContext, ActionExecutionResult } from '../types/actionConfig.js';

export function App({ filePath, theme = 'dark-plus', configPath }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalHeight = Math.max(10, (stdout?.rows || 24) - 1); // -1 to prevent flickering in iTerm2 when content exceeds screen height
  
  
  // File loading state
  const { loading, error, content, metadata, loadFile } = useFileLoader({
    autoLoad: true, // Enable autoLoad
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
  

  // Action System State
  const [actionRegistry, setActionRegistry] = useState<ActionRegistry | null>(null);
  const [actionExecutor, setActionExecutor] = useState<ActionExecutor | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusMessageType, setStatusMessageType] = useState<'success' | 'warning' | 'error' | undefined>(undefined);

  // Calculate viewport height for scrolling logic
  const viewportHeight = Math.max(10, terminalHeight - 1);  // -1 for status bar (height already reduced for iTerm2 compatibility)


  // Clear selections when file content changes
  useEffect(() => {
    clearSelection();
  }, [content, clearSelection]);

  // Initialize Action System
  useEffect(() => {
    const initializeActionSystem = async () => {
      try {
        // Create action registry
        const registry = await createActionRegistry(configPath); // If configPath is undefined, will auto-load from actions directory
        setActionRegistry(registry);
        
        // Make registry available to JavaScript actions
        (global as any).__hiliner_registry = registry;

        // Create builtin action handler
        const builtinHandler = createBuiltinHandler({
          quit: () => {
            exit();
            return { success: true, message: 'Exiting application' };
          },
          scrollUp: () => {
            if (content && content.length > 0) {
              const newPos = Math.max(0, cursorPosition - 1);
              setCursorPosition(newPos);
              if (newPos < scrollPosition) {
                setScrollPosition(newPos);
              }
            }
            return { success: true };
          },
          scrollDown: () => {
            if (content && content.length > 0) {
              const maxLine = Math.max(0, content.length - 1);
              const newPos = Math.min(maxLine, cursorPosition + 1);
              setCursorPosition(newPos);
              if (newPos >= scrollPosition + viewportHeight) {
                setScrollPosition(newPos - viewportHeight + 1);
              }
            }
            return { success: true };
          },
          pageUp: () => {
            if (content && content.length > 0) {
              const pageSize = Math.max(1, viewportHeight - 1);
              const newPos = Math.max(0, cursorPosition - pageSize);
              setCursorPosition(newPos);
              if (newPos < scrollPosition) {
                setScrollPosition(newPos);
              }
            }
            return { success: true };
          },
          pageDown: () => {
            if (content && content.length > 0) {
              const maxLine = Math.max(0, content.length - 1);
              const pageSize = Math.max(1, viewportHeight - 1);
              const newPos = Math.min(maxLine, cursorPosition + pageSize);
              setCursorPosition(newPos);
              if (newPos >= scrollPosition + viewportHeight) {
                setScrollPosition(newPos - viewportHeight + 1);
              }
            }
            return { success: true };
          },
          goToStart: () => {
            setCursorPosition(0);
            setScrollPosition(0);
            return { success: true };
          },
          goToEnd: () => {
            if (content && content.length > 0) {
              const maxLine = Math.max(0, content.length - 1);
              setCursorPosition(maxLine);
              setScrollPosition(Math.max(0, maxLine - viewportHeight + 1));
            }
            return { success: true };
          },
          toggleSelection: () => {
            if (content && content.length > 0) {
              toggleSelection(cursorPosition + 1);
            }
            return { success: true };
          },
          selectAll: () => {
            if (content && content.length > 0) {
              const startLine = Math.max(1, scrollPosition + 1);
              const endLine = Math.min(content.length, scrollPosition + viewportHeight);
              selectAll(startLine, endLine);
            }
            return { success: true };
          },
          clearSelection: () => {
            clearSelection();
            setRangeSelectionStart(null);
            return { success: true };
          },
          showHelp: () => {
            setStatusMessage('Help: q=quit, j/k=scroll, space=select, a=select all, c=clear, r=reload');
            setStatusMessageType(undefined);
            return { success: true, message: 'Help displayed' };
          },
          reload: () => {
            if (filePath) {
              clearSelection();
              setScrollPosition(0);
              setCursorPosition(0);
              setStatusMessage('Reloading file...');
              setStatusMessageType(undefined);
              loadFile(filePath);
            }
            return { success: true, message: 'File reloaded' };
          }
        });

        // Create action executor with Hiliner API provider
        const executor = new ActionExecutor({
          builtinHandler,
          defaultTimeout: 10000,
          hilinerAPIProvider: () => ({
            updateStatus: (message: string, options?: any) => {
              setStatusMessage(message);
              setStatusMessageType(options?.type || 'info');
            },
            clearStatus: () => {
              setStatusMessage('');
              setStatusMessageType(undefined);
            },
            getFileInfo: () => ({
              path: filePath || 'unknown',
              language: metadata?.detectedLanguage || 'unknown',
              totalLines: content?.length || 0,
              currentLine: cursorPosition + 1
            }),
            getSelectionInfo: () => ({
              selectedLines: Array.from(selectedLines),
              selectionCount,
              selectedText: Array.from(selectedLines)
                .sort((a, b) => a - b)
                .map(line => content?.[line - 1] || '')
                .join('\n')
            })
          })
        });
        setActionExecutor(executor);

      } catch (error) {
        console.error('Failed to initialize Action System:', error);
        setStatusMessage('Failed to initialize Action System');
        setStatusMessageType('error');
      }
    };

    initializeActionSystem();
  }, [exit, content, cursorPosition, scrollPosition, viewportHeight, toggleSelection, selectAll, clearSelection, filePath, loadFile, configPath]);
  
  // Helper function to convert Key object to string for action matching
  const getKeyString = useCallback((input: string, key: Key): string => {
    if (key.ctrl && input) {
      return `ctrl+${input}`;
    }
    if (key.shift && key.tab) {
      return 'shift+tab';
    }
    if (key.upArrow) return 'arrowup';
    if (key.downArrow) return 'arrowdown';
    if (key.leftArrow) return 'arrowleft';
    if (key.rightArrow) return 'arrowright';
    if (key.pageUp) return 'pageup';
    if (key.pageDown) return 'pagedown';
    if (key.tab) return 'tab';
    if (key.escape) return 'escape';
    if (key.return) return 'return';
    if (input === ' ') return 'space';
    return input;
  }, []);

  // Helper function to build action execution context
  const buildExecutionContext = useCallback((): ActionExecutionContext | null => {
    if (!filePath || !content) return null;

    return {
      currentFile: filePath,
      currentLine: cursorPosition + 1,
      currentColumn: columnPosition,
      selectedLines: Array.from(selectedLines),
      selectedText: Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(line => content[line - 1] || '')
        .join('\n'),
      fileName: filePath.split('/').pop() || '',
      fileDir: filePath.substring(0, filePath.lastIndexOf('/')),
      totalLines: content.length,
      viewportStart: scrollPosition + 1,
      viewportEnd: Math.min(content.length, scrollPosition + viewportHeight),
      theme: theme,
      hasSelection: selectionCount > 0,
      fileMetadata: metadata ? {
        size: metadata.size,
        encoding: metadata.encoding,
        isBinary: metadata.isBinary,
        detectedLanguage: metadata.detectedLanguage
      } : undefined
    };
  }, [filePath, content, cursorPosition, columnPosition, selectedLines, scrollPosition, viewportHeight, theme, selectionCount, metadata]);

  // Handle keyboard input with Action System integration
  useInput(async (input: string, key: Key) => {
    // Clear previous status message after a delay
    if (statusMessage) {
      setTimeout(() => {
        setStatusMessage('');
        setStatusMessageType(undefined);
      }, 3000);
    }

    // Try to match action first if Action System is initialized
    if (actionRegistry && actionExecutor && content && content.length > 0) {
      const keyString = getKeyString(input, key);
      console.error('DEBUG: Key pressed:', keyString);
      const action = actionRegistry.getActionByKey(keyString);
      console.error('DEBUG: Action found:', action?.id);
      
      if (action) {
        try {
          const executionContext = buildExecutionContext();
          if (executionContext) {
            const selectionState: SelectionState = {
              selectedLines,
              selectionCount,
              lastSelectedLine: Array.from(selectedLines).sort((a, b) => b - a)[0]
            };

            console.error('DEBUG: Selection state:', { 
              selectionCount, 
              hasSelection: selectionCount > 0,
              selectedLinesSize: selectedLines.size,
              selectedLinesArray: Array.from(selectedLines)
            });
            console.error('DEBUG: Action conditions:', action.when);

            const fileData: FileData = {
              content: content.join('\n'),
              lines: content,
              totalLines: content.length,
              filePath: filePath!,
              metadata: metadata || undefined
            };

            const actionContext = buildActionContext(selectionState, fileData, cursorPosition + 1);
            const result = await actionExecutor.executeAction(action, executionContext, actionContext);
            
            // Display actual command output if available, otherwise show message
            if (result.output) {
              // Show the actual output from the command
              const outputLines = result.output.split('\n');
              const displayOutput = outputLines.length > 1 
                ? outputLines[0] + (outputLines.length > 2 ? '...' : ' ' + outputLines[1] || '')
                : result.output;
              setStatusMessage(displayOutput);
              setStatusMessageType(result.messageType === 'info' ? undefined : result.messageType);
            } else if (result.message) {
              setStatusMessage(result.message);
              setStatusMessageType(result.messageType === 'info' ? undefined : result.messageType);
            }
            
            // If action was successful and handled, return early
            if (result.success) {
              return;
            }
          }
        } catch (error) {
          setStatusMessage(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
          setStatusMessageType('error');
          return;
        }
      }
    }

    // Fall back to original keyboard handling for compatibility
    // Handle quit commands immediately (fallback for when Action System not ready)
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
        console.error('DEBUG: Tab pressed - toggling selection for line:', cursorPosition + 1);
        toggleSelection(cursorPosition + 1); // Convert 0-based to 1-based line number
        setRangeSelectionStart(cursorPosition + 1); // Mark as potential range start
        console.error('DEBUG: After toggle - selectedLines size:', selectedLines.size, 'selectionCount:', selectionCount);
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
      } else if (key.pageDown) {
        // Page down (pageDown key only)
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
        <StatusBar 
          message={statusMessage}
          messageType={statusMessageType}
        />
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
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
          isLoading={true} 
          message={statusMessage}
          messageType={statusMessageType}
        />
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
          message={statusMessage}
          messageType={statusMessageType}
        />
      </Box>
    );
  }

  // Empty file (but not while loading)
  if (!loading && content.length === 0) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text>File is empty</Text>
        </Box>
        <StatusBar 
          fileName={filePath.split('/').pop() || ''} 
          message={statusMessage}
          messageType={statusMessageType}
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
          message={statusMessage}
          messageType={statusMessageType}
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
        message={statusMessage}
        messageType={statusMessageType}
      />
    </Box>
  );
}