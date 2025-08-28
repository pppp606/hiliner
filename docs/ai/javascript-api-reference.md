# Hiliner JavaScript API Reference for AI Agents

## Overview

This reference provides complete documentation for AI agents helping users create JavaScript scripts for Hiliner. Scripts can be inline (in action configurations) or external files in `scripts/javascript/`.

## Execution Environment

### Runtime Context
- **Node.js Environment**: Full access to built-in modules (`fs`, `path`, `os`)
- **CommonJS**: Use `require()` not `import` statements
- **Global Injection**: `hiliner` object automatically available
- **Working Directory**: Hiliner's current working directory

### Global API Object

All scripts have access to `hiliner` global:

```javascript
// No import needed - automatically injected
const fileInfo = hiliner.getFileInfo();
hiliner.updateStatus('Script running!');
```

## Core API Methods

### `hiliner.updateStatus(message: string): void`

Display message in status bar. Replaces existing message.

**Parameters:**
- `message`: Text to display (supports Unicode emojis)

**Example:**
```javascript
hiliner.updateStatus('⏳ Processing...');
hiliner.updateStatus('✅ Complete!');
```

### `hiliner.getFileInfo(): FileInfo`

Get information about currently loaded file.

**Returns:**
```typescript
interface FileInfo {
  path: string;        // Absolute file path
  totalLines: number;  // Total lines in file
  language?: string;   // Detected language ("javascript", "python", etc.)
  currentLine?: number;// Current cursor position (1-based)
}
```

**Example:**
```javascript
const info = hiliner.getFileInfo();
console.log(`File: ${info.path}`);
console.log(`Lines: ${info.totalLines}`);
console.log(`Language: ${info.language || 'unknown'}`);
```

### `hiliner.getSelectionInfo(): SelectionInfo`

Get current line selection state.

**Returns:**
```typescript
interface SelectionInfo {
  selectedLines: number[];    // Array of selected line numbers (1-based)
  selectionCount: number;     // Total count of selected lines
  selectedText?: string;      // Content of selected lines (newline-joined)
  lineStart?: number;         // First selected line number
  lineEnd?: number;           // Last selected line number
  hasSelection: boolean;      // Whether any lines are selected
}
```

**Example:**
```javascript
const selection = hiliner.getSelectionInfo();

if (selection.hasSelection) {
  console.log(`Selected ${selection.selectionCount} lines`);
  console.log(`Range: ${selection.lineStart}-${selection.lineEnd}`);
  console.log(`Content length: ${selection.selectedText.length} chars`);
} else {
  console.log('No selection');
}
```

### `hiliner.clearStatus(): void`

Clear the status bar message.

**Example:**
```javascript
hiliner.clearStatus(); // Remove status message
```

## Environment Variables Access

Scripts can access shell environment variables:

```javascript
// File information
const filePath = process.env.FILE_PATH;
const language = process.env.LANGUAGE;
const totalLines = parseInt(process.env.TOTAL_LINES);

// Selection information
const selectedText = process.env.SELECTED_TEXT;
const selectionCount = parseInt(process.env.SELECTION_COUNT);
const currentLine = parseInt(process.env.CURRENT_LINE);

// API methods are preferred over environment variables
const fileInfo = hiliner.getFileInfo(); // Recommended
const selection = hiliner.getSelectionInfo(); // Recommended
```

## Common Script Patterns

### 1. Basic Status Update
```javascript
/**
 * Simple status message
 */
hiliner.updateStatus('Hello from JavaScript!');

// Show file information
const info = hiliner.getFileInfo();
hiliner.updateStatus(`📄 ${path.basename(info.path)} (${info.totalLines} lines)`);
```

### 2. File Content Analysis
```javascript
/**
 * Analyze file content with Node.js fs module
 */
const fs = require('fs');
const path = require('path');

try {
  const fileInfo = hiliner.getFileInfo();
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  
  const stats = {
    total: lines.length,
    nonEmpty: lines.filter(line => line.trim()).length,
    words: content.split(/\s+/).length,
    chars: content.length
  };
  
  hiliner.updateStatus(`📊 ${stats.nonEmpty}/${stats.total} lines, ${stats.words} words`);
  
} catch (error) {
  hiliner.updateStatus(`❌ Error: ${error.message}`);
}
```

### 3. Selection Processing
```javascript
/**
 * Process selected text
 */
const selection = hiliner.getSelectionInfo();

if (!selection.hasSelection) {
  hiliner.updateStatus('❌ Please select lines first');
  return;
}

// Process selected content
const lines = selection.selectedText.split('\n');
const wordCount = selection.selectedText.split(/\s+/).length;
const charCount = selection.selectedText.length;

hiliner.updateStatus(`✅ Selection: ${lines.length} lines, ${wordCount} words, ${charCount} chars`);
```

### 4. Language-Specific Analysis
```javascript
/**
 * Different analysis based on detected language
 */
const fs = require('fs');

try {
  const fileInfo = hiliner.getFileInfo();
  const content = fs.readFileSync(fileInfo.path, 'utf-8');

  switch (fileInfo.language) {
    case 'javascript':
    case 'typescript':
      const functions = (content.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length;
      const classes = (content.match(/class\s+\w+/g) || []).length;
      hiliner.updateStatus(`📦 JS/TS: ${functions} functions, ${classes} classes`);
      break;
      
    case 'python':
      const pyFunctions = (content.match(/def\s+\w+/g) || []).length;
      const pyClasses = (content.match(/class\s+\w+/g) || []).length;
      hiliner.updateStatus(`🐍 Python: ${pyFunctions} functions, ${pyClasses} classes`);
      break;
      
    default:
      hiliner.updateStatus(`📄 ${fileInfo.language || 'unknown'}: ${fileInfo.totalLines} lines`);
  }
  
} catch (error) {
  hiliner.updateStatus(`❌ Analysis failed: ${error.message}`);
}
```

### 5. File System Operations
```javascript
/**
 * File system operations with error handling
 */
const fs = require('fs');
const path = require('path');

try {
  const fileInfo = hiliner.getFileInfo();
  const dir = path.dirname(fileInfo.path);
  const fileName = path.basename(fileInfo.path);
  const ext = path.extname(fileName);
  
  // Find similar files
  const files = fs.readdirSync(dir);
  const sameType = files.filter(f => path.extname(f) === ext);
  
  hiliner.updateStatus(`📁 Found ${sameType.length} ${ext} files in directory`);
  
  // Log details for debugging
  console.log('Similar files:', sameType.join(', '));
  
} catch (error) {
  hiliner.updateStatus(`❌ FS Error: ${error.message}`);
  console.error('File system operation failed:', error);
}
```

### 6. Async Operations
```javascript
/**
 * Handle asynchronous operations
 */
const fs = require('fs').promises;

(async () => {
  try {
    hiliner.updateStatus('⏳ Processing...');
    
    const fileInfo = hiliner.getFileInfo();
    const content = await fs.readFile(fileInfo.path, 'utf-8');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lineCount = content.split('\n').length;
    hiliner.updateStatus(`✅ Async processing complete: ${lineCount} lines`);
    
  } catch (error) {
    hiliner.updateStatus(`❌ Async error: ${error.message}`);
  }
})();
```

## Error Handling Best Practices

### 1. Always Use Try-Catch
```javascript
try {
  // Potentially failing operations
  const result = riskyOperation();
  hiliner.updateStatus(`✅ Success: ${result}`);
} catch (error) {
  hiliner.updateStatus(`❌ Error: ${error.message}`);
  console.error('Detailed error:', error);
}
```

### 2. Validate Prerequisites
```javascript
// Check file is loaded
const fileInfo = hiliner.getFileInfo();
if (!fileInfo.path) {
  hiliner.updateStatus('❌ No file loaded');
  return;
}

// Check selection when needed
const selection = hiliner.getSelectionInfo();
if (!selection.hasSelection) {
  hiliner.updateStatus('❌ Please select lines first');
  return;
}

// Check file size before processing
const fs = require('fs');
const stats = fs.statSync(fileInfo.path);
if (stats.size > 10 * 1024 * 1024) { // 10MB
  hiliner.updateStatus('❌ File too large for processing');
  return;
}
```

### 3. Provide Progress Updates
```javascript
// For long operations
const items = getLargeArray();
hiliner.updateStatus(`⏳ Processing ${items.length} items...`);

for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
  
  // Update progress every 100 items
  if (i % 100 === 0) {
    const percent = Math.round((i / items.length) * 100);
    hiliner.updateStatus(`⏳ Progress: ${percent}% (${i}/${items.length})`);
  }
}

hiliner.updateStatus('✅ Processing complete!');
```

## External Script File Structure

### Basic Template
```javascript
/**
 * External script template
 */

try {
  hiliner.updateStatus('⏳ Script starting...');
  
  // Get context information
  const fileInfo = hiliner.getFileInfo();
  const selection = hiliner.getSelectionInfo();
  
  // Validate prerequisites
  if (!fileInfo.path) {
    hiliner.updateStatus('❌ No file loaded');
    return;
  }
  
  // Main processing logic here
  // ...
  
  hiliner.updateStatus('✅ Script completed successfully!');
  
} catch (error) {
  hiliner.updateStatus(`❌ Script failed: ${error.message}`);
  console.error('Script error details:', error);
}
```

### Advanced Template with Node.js APIs
```javascript
/**
 * Advanced script with file system operations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  hiliner.updateStatus('⏳ Advanced processing...');
  
  const fileInfo = hiliner.getFileInfo();
  
  // File operations
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const tempFile = path.join(os.tmpdir(), 'hiliner-temp.txt');
  
  // Process and write temporary file
  const processed = processContent(content);
  fs.writeFileSync(tempFile, processed);
  
  hiliner.updateStatus(`✅ Processed and saved to ${tempFile}`);
  
} catch (error) {
  hiliner.updateStatus(`❌ Advanced processing failed: ${error.message}`);
}

function processContent(content) {
  // Custom processing logic
  return content.toUpperCase();
}
```

## AI Agent Guidelines

When helping users create JavaScript scripts:

### 1. Structure Recommendations
- Always include try-catch blocks
- Start with status update indicating processing
- Validate prerequisites before main logic
- End with success/failure status
- Use descriptive variable names

### 2. API Usage Patterns
- Prefer `hiliner.getFileInfo()` over `process.env.FILE_PATH`
- Use `hiliner.updateStatus()` for user feedback
- Access Node.js modules with `require()`
- Handle both selection and no-selection cases

### 3. Common Implementations

**File Statistics:**
```javascript
const fs = require('fs');
const fileInfo = hiliner.getFileInfo();
const content = fs.readFileSync(fileInfo.path, 'utf-8');
const lines = content.split('\n');
const words = content.split(/\s+/).length;
hiliner.updateStatus(`📊 ${lines.length} lines, ${words} words`);
```

**Selection Word Count:**
```javascript
const selection = hiliner.getSelectionInfo();
if (selection.hasSelection) {
  const words = selection.selectedText.split(/\s+/).length;
  hiliner.updateStatus(`📝 Selected: ${words} words`);
}
```

**Language Detection:**
```javascript
const fileInfo = hiliner.getFileInfo();
if (fileInfo.language) {
  hiliner.updateStatus(`🔍 Detected: ${fileInfo.language}`);
} else {
  hiliner.updateStatus('🔍 Language: unknown');
}
```

This reference provides complete information for AI agents to help users create effective JavaScript scripts for Hiliner.