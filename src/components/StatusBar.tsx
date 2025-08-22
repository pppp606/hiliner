import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../types.js';

function StatusBarComponent({
  fileName,
  currentLine,
  totalLines,
  isLoading = false,
  isError = false,
  errorMessage,
  isBinary = false,
  selectionCount = 0,
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
    const statusParts = [];
    
    if (isLoading) {
      return 'Loading...';
    }
    if (isError && errorMessage) {
      return `Error: ${errorMessage}`;
    }
    if (isBinary) {
      statusParts.push('[Binary]');
    }
    
    // Add selection count if lines are selected
    if (selectionCount > 0) {
      statusParts.push(`${selectionCount} selected`);
    }
    
    return statusParts.join(' | ');
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