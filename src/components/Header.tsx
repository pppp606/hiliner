import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  filePath?: string;
  fileSize?: string;
  totalLines?: number;
  currentLine?: number;
  currentColumn?: number;
  showShortcuts?: boolean;
  mode?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isReadOnly?: boolean;
  encoding?: string;
  isBinary?: boolean;
  maxWidth?: number;
  theme?: string;
  accentColor?: string;
}

export function Header({
  filePath,
  fileSize,
  totalLines,
  currentLine,
  currentColumn,
  showShortcuts = false,
  mode = 'viewing',
  isLoading = false,
  isError = false,
  errorMessage,
  isReadOnly = false,
  encoding,
  isBinary = false,
  maxWidth,
  theme,
  accentColor
}: HeaderProps): React.ReactElement {

  // Extract filename from path
  const fileName = filePath ? filePath.split('/').pop() || filePath : '';
  
  // Build status indicators
  const indicators = [];
  
  if (isLoading) {
    indicators.push('Loading...');
  } else if (isError && errorMessage) {
    indicators.push(`Error: ${errorMessage}`);
  } else {
    if (isReadOnly) indicators.push('[RO]');
    if (isBinary) indicators.push('[BIN]');
    if (encoding && encoding !== 'UTF-8') indicators.push(encoding);
  }

  // Build file info
  const fileInfo = [];
  if (fileName) fileInfo.push(fileName);
  if (fileSize) fileInfo.push(fileSize);
  if (totalLines !== undefined) {
    const lineText = totalLines === 1 ? 'line' : 'lines';
    fileInfo.push(`${totalLines} ${lineText}`);
  }

  // Build position info
  const positionInfo = [];
  if (currentLine !== undefined && totalLines !== undefined && totalLines > 0) {
    positionInfo.push(`${currentLine}/${totalLines}`);
    
    // Calculate percentage
    const percentage = Math.round((currentLine / totalLines) * 100);
    if (percentage === 0 || currentLine === 1) {
      positionInfo.push('Top');
    } else if (percentage === 100 || currentLine === totalLines) {
      positionInfo.push('Bottom');
    } else if (percentage === 50) {
      positionInfo.push('50%');
    } else {
      positionInfo.push(`${percentage}%`);
    }
  }
  
  if (currentColumn !== undefined && currentColumn > 0) {
    positionInfo.push(`Col ${currentColumn}`);
  }

  // Build shortcuts display
  const shortcuts = [];
  if (showShortcuts) {
    shortcuts.push('↑↓ Navigate');
    shortcuts.push('q Quit');
    shortcuts.push('? Help');
  } else {
    // Always show help availability
    shortcuts.push('? Help');
  }

  // Combine all info sections
  const leftSection = [...fileInfo, ...indicators].join(' | ');
  const centerSection = positionInfo.join(' ');
  const rightSection = shortcuts.join(' | ');

  // Handle width constraints
  let displayLeft = leftSection;
  let displayCenter = centerSection;
  let displayRight = rightSection;

  if (maxWidth && maxWidth > 0) {
    const totalLength = leftSection.length + centerSection.length + rightSection.length + 6; // spacing
    if (totalLength > maxWidth) {
      // Prioritize filename and position
      const essentialInfo = fileName + (currentLine ? ` ${currentLine}/${totalLines}` : '');
      if (essentialInfo.length < maxWidth - 10) {
        displayLeft = fileName;
        displayCenter = positionInfo.slice(0, 1).join(' '); // Just position
        displayRight = '? Help';
      } else {
        displayLeft = fileName.length > maxWidth - 20 ? fileName.slice(0, maxWidth - 20) + '...' : fileName;
        displayCenter = '';
        displayRight = '?';
      }
    }
  }

  return (
    <Box 
      borderStyle="single" 
      borderColor={isError ? 'red' : 'gray'}
      paddingX={1}
    >
      <Box flexGrow={1}>
        <Text color={isError ? 'red' : undefined}>
          {displayLeft}
        </Text>
      </Box>
      <Box>
        <Text color="blue">
          {displayCenter}
        </Text>
      </Box>
      <Box marginLeft={1}>
        <Text color="dim">
          {displayRight}
        </Text>
      </Box>
    </Box>
  );
}