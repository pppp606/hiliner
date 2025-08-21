import React, { memo } from 'react';
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

function StatusBarComponent({
  fileName,
  currentLine,
  totalLines,
  currentColumn,
  isLoading = false,
  isError = false,
  errorMessage,
  isBinary = false,
}: StatusBarProps): React.ReactElement {

  // Build position information
  const buildPositionInfo = () => {
    if (currentLine !== undefined && totalLines !== undefined && totalLines > 0) {
      const percentage = Math.round((currentLine / totalLines) * 100);
      
      // Special position indicators
      if (currentLine === 1) {
        return `Top  ${currentLine}/${totalLines}`;
      } else if (currentLine === totalLines) {
        return `Bot  ${currentLine}/${totalLines}`;
      } else {
        return `${percentage}%  ${currentLine}/${totalLines}`;
      }
    }
    return '';
  };

  // Build status message
  const buildStatus = () => {
    if (isLoading) {
      return 'Loading...';
    }
    if (isError && errorMessage) {
      return `Error: ${errorMessage}`;
    }
    if (isBinary) {
      return '[Binary]';
    }
    return '';
  };

  const positionInfo = buildPositionInfo();
  const statusMessage = buildStatus();

  // Build the status bar content
  const leftContent = ` ${fileName || 'No file'}${statusMessage ? ` | ${statusMessage}` : ''}`;
  const rightContent = positionInfo ? `${positionInfo} ` : '';
  
  return (
    <Box width="100%" flexDirection="row">
      <Text inverse>
        {leftContent}
      </Text>
      <Box flexGrow={1} />
      {rightContent && (
        <Text inverse>
          {rightContent}
        </Text>
      )}
    </Box>
  );
}

export const StatusBar = memo(StatusBarComponent);