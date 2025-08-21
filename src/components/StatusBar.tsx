import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  fileName?: string;
  currentLine?: number;
  totalLines?: number;
  currentColumn?: number;
  viewportStart?: number;
  viewportEnd?: number;
  encoding?: string;
  isReadOnly?: boolean;
  isBinary?: boolean;
  mode?: string;
  searchTerm?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  message?: string;
  messageType?: 'success' | 'warning' | 'error';
  temporaryMessage?: string;
  temporaryMessageDuration?: number;
  showNavigation?: boolean;
  displayMode?: 'compact' | 'full';
  maxWidth?: number;
  theme?: string;
  accentColor?: string;
  fontSize?: string;
  onShortcutPress?: (shortcut: string) => void;
  syncWithParent?: boolean;
}

export function StatusBar({
  fileName,
  currentLine,
  totalLines,
  currentColumn,
  viewportStart,
  viewportEnd,
  encoding,
  isReadOnly = false,
  isBinary = false,
  mode = 'viewing',
  searchTerm,
  isLoading = false,
  isError = false,
  errorMessage,
  message,
  messageType,
  temporaryMessage,
  temporaryMessageDuration,
  showNavigation = true,
  displayMode = 'full',
  maxWidth,
  theme,
  accentColor,
  fontSize,
  onShortcutPress,
  syncWithParent
}: StatusBarProps): React.ReactElement {

  // Build position information
  const buildPositionInfo = () => {
    const parts = [];
    
    if (currentLine !== undefined && totalLines !== undefined && totalLines > 0) {
      const percentage = Math.round((currentLine / totalLines) * 100);
      
      // Special position indicators
      if (currentLine === 1) {
        parts.push('Top');
      } else if (currentLine === totalLines) {
        parts.push('Bottom');
      } else if (percentage === 25) {
        parts.push('1/4');
      } else if (percentage === 50) {
        parts.push('Half');
      } else {
        parts.push(`${percentage}%`);
      }
      
      parts.push(`${currentLine}/${totalLines}`);
    }
    
    if (currentColumn !== undefined && currentColumn > 0) {
      parts.push(`Col ${currentColumn}`);
    }

    if (viewportStart !== undefined && viewportEnd !== undefined) {
      parts.push(`View ${viewportStart}-${viewportEnd}`);
    }
    
    return parts.join(' ');
  };

  // Build status indicators
  const buildStatusIndicators = () => {
    const indicators = [];
    
    if (temporaryMessage) {
      return temporaryMessage;
    }
    
    if (isLoading) {
      return 'Loading...';
    }
    
    if (isError && errorMessage) {
      return `Error: ${errorMessage}`;
    }
    
    if (message) {
      const prefix = messageType === 'warning' ? 'Warning: ' : '';
      return prefix + message;
    }
    
    // File status indicators
    if (isReadOnly) indicators.push('[RO]');
    if (isBinary) indicators.push('[BIN]');
    if (encoding && encoding !== 'UTF-8') indicators.push(encoding);
    
    // Mode indicators
    if (mode === 'search' && searchTerm) {
      indicators.push(`Search: ${searchTerm}`);
    } else if (mode !== 'viewing') {
      indicators.push(mode);
    }
    
    return indicators.join(' ');
  };

  // Build shortcut information
  const buildShortcuts = () => {
    const shortcuts = [];
    
    // Essential shortcuts (always shown)
    shortcuts.push('q:Quit');
    shortcuts.push('?:Help');
    
    // Navigation shortcuts (if enabled and in full mode)
    if (showNavigation && displayMode === 'full') {
      shortcuts.push('↑↓:Navigate');
      shortcuts.push('PgDn/PgUp:Page');
    }
    
    return shortcuts.join(' | ');
  };

  // Get information sections
  const positionInfo = buildPositionInfo();
  const statusInfo = buildStatusIndicators();
  const shortcutInfo = buildShortcuts();

  // Handle width constraints and layout
  let leftSection = fileName || '';
  let centerSection = positionInfo;
  let rightSection = shortcutInfo;

  // Priority display when space is limited
  if (maxWidth && maxWidth > 0) {
    const totalNeeded = leftSection.length + centerSection.length + rightSection.length + 6;
    
    if (totalNeeded > maxWidth) {
      if (maxWidth <= 40) {
        // Very limited space - show essentials only
        leftSection = '';
        centerSection = currentLine ? `${currentLine}` : '';
        rightSection = 'q:Quit';
      } else {
        // Moderate space - abbreviate
        if (leftSection.length > 15) {
          leftSection = leftSection.slice(0, 12) + '...';
        }
        rightSection = 'q:Quit | ?:Help';
      }
    }
  }

  // Status color based on state
  let statusColor = 'white';
  if (isError || messageType === 'error') {
    statusColor = 'red';
  } else if (messageType === 'warning') {
    statusColor = 'yellow';
  } else if (messageType === 'success') {
    statusColor = 'green';
  } else if (isLoading) {
    statusColor = 'blue';
  }

  return (
    <Box 
      borderStyle="single" 
      borderColor="gray"
      paddingX={1}
    >
      {/* Left: File name and status */}
      <Box>
        <Text>
          {leftSection}
          {statusInfo && leftSection && ' | '}
        </Text>
        {statusInfo && <Text color={statusColor}>{statusInfo}</Text>}
      </Box>
      
      {/* Center: Position info */}
      <Box flexGrow={1} justifyContent="center">
        <Text color="blue">
          {centerSection}
        </Text>
      </Box>
      
      {/* Right: Shortcuts */}
      <Box>
        <Text color="dim">
          {rightSection}
        </Text>
      </Box>
    </Box>
  );
}