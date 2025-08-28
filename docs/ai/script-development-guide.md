# Hiliner Script Development Guide for AI Agents

## Overview

This guide provides AI agents with practical patterns and examples for helping users develop custom scripts for Hiliner. Focus on external JavaScript files in `scripts/javascript/` directory for complex functionality.

## Directory Organization

### Recommended Structure
```
scripts/javascript/
├── analysis/
│   ├── file-stats.js       # Basic file statistics
│   ├── code-metrics.js     # Language-specific metrics
│   └── content-analysis.js # Text analysis tools
├── automation/
│   ├── format-code.js      # Code formatting
│   ├── generate-docs.js    # Documentation generation
│   └── bulk-operations.js  # Batch processing
├── integration/
│   ├── git-operations.js   # Git integration
│   ├── editor-bridge.js    # External editor integration
│   └── clipboard-utils.js  # Advanced clipboard operations
└── utilities/
    ├── file-helpers.js     # Common file operations
    ├── text-processors.js  # Text manipulation
    └── validation.js       # Input validation utilities
```

## Development Patterns

### 1. Basic Script Structure

**Template for all scripts:**
```javascript
/**
 * Script Name - Brief description
 * 
 * Usage: Triggered by action key binding
 * Prerequisites: File loaded, optional selection
 */

// Import Node.js modules as needed
const fs = require('fs');
const path = require('path');

// Main execution wrapper
(async () => {
  try {
    // Initial status
    hiliner.updateStatus('⏳ Processing...');
    
    // Validate environment
    const validation = validateEnvironment();
    if (!validation.valid) {
      hiliner.updateStatus(`❌ ${validation.error}`);
      return;
    }
    
    // Main processing
    const result = await processData();
    
    // Success feedback
    hiliner.updateStatus(`✅ ${result.message}`);
    
  } catch (error) {
    hiliner.updateStatus(`❌ Error: ${error.message}`);
    console.error('Script error:', error);
  }
})();

function validateEnvironment() {
  const fileInfo = hiliner.getFileInfo();
  
  if (!fileInfo.path) {
    return { valid: false, error: 'No file loaded' };
  }
  
  // Add specific validations as needed
  return { valid: true };
}

async function processData() {
  // Main logic here
  return { message: 'Processing complete' };
}
```

### 2. File Analysis Scripts

**Basic file statistics:**
```javascript
/**
 * File Statistics Analyzer
 */

const fs = require('fs');
const path = require('path');

try {
  hiliner.updateStatus('📊 Analyzing file...');
  
  const fileInfo = hiliner.getFileInfo();
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  
  // Calculate statistics
  const stats = {
    totalLines: lines.length,
    nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
    blankLines: lines.filter(line => line.trim().length === 0).length,
    totalChars: content.length,
    totalWords: content.split(/\s+/).filter(word => word.length > 0).length,
    avgLineLength: Math.round(content.length / lines.length),
    fileSize: fs.statSync(fileInfo.path).size
  };
  
  // Format results
  const summary = [
    `📄 File: ${path.basename(fileInfo.path)}`,
    `📏 Lines: ${stats.nonEmptyLines}/${stats.totalLines} (${stats.blankLines} blank)`,
    `📝 Words: ${stats.totalWords}, Chars: ${stats.totalChars}`,
    `📐 Avg line length: ${stats.avgLineLength}`,
    `💾 Size: ${formatBytes(stats.fileSize)}`
  ].join(' | ');
  
  hiliner.updateStatus(summary);
  
  // Detailed console output
  console.log('Detailed Statistics:');
  console.log(JSON.stringify(stats, null, 2));
  
} catch (error) {
  hiliner.updateStatus(`❌ Analysis failed: ${error.message}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
```

**Language-specific code metrics:**
```javascript
/**
 * Code Metrics Analyzer
 */

const fs = require('fs');

const languagePatterns = {
  javascript: {
    functions: /(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>|class\s+\w+)/g,
    comments: /(?:\/\/.*|\/\*[\s\S]*?\*\/)/g,
    imports: /(?:import\s+.*from|require\s*\()/g,
    classes: /class\s+\w+/g
  },
  python: {
    functions: /def\s+\w+/g,
    comments: /#.*/g,
    imports: /(?:import\s+\w+|from\s+\w+\s+import)/g,
    classes: /class\s+\w+/g
  },
  rust: {
    functions: /fn\s+\w+/g,
    comments: /(?:\/\/.*|\/\*[\s\S]*?\*\/)/g,
    imports: /use\s+\w+/g,
    structs: /struct\s+\w+/g
  }
};

try {
  const fileInfo = hiliner.getFileInfo();
  const language = fileInfo.language;
  
  if (!language || !languagePatterns[language]) {
    hiliner.updateStatus(`❌ Language '${language}' not supported for metrics`);
    return;
  }
  
  hiliner.updateStatus(`🔍 Analyzing ${language} code...`);
  
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const patterns = languagePatterns[language];
  
  const metrics = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern) || [];
    metrics[type] = matches.length;
  }
  
  // Calculate complexity score (simple heuristic)
  const complexity = metrics.functions * 2 + metrics.classes * 3;
  
  const summary = Object.entries(metrics)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');
  
  hiliner.updateStatus(`📊 ${language}: ${summary} (complexity: ${complexity})`);
  
} catch (error) {
  hiliner.updateStatus(`❌ Code analysis failed: ${error.message}`);
}
```

### 3. Selection Processing Scripts

**Text analysis on selection:**
```javascript
/**
 * Selection Text Analyzer
 */

try {
  const selection = hiliner.getSelectionInfo();
  
  if (!selection.hasSelection) {
    hiliner.updateStatus('❌ Please select lines to analyze');
    return;
  }
  
  hiliner.updateStatus(`🔍 Analyzing ${selection.selectionCount} selected lines...`);
  
  const text = selection.selectedText;
  const lines = text.split('\n');
  
  // Text analysis
  const analysis = {
    lines: lines.length,
    words: text.split(/\s+/).filter(word => word.length > 0).length,
    chars: text.length,
    charsNoSpaces: text.replace(/\s/g, '').length,
    sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    avgWordsPerLine: 0,
    longestLine: Math.max(...lines.map(line => line.length)),
    shortestLine: Math.min(...lines.map(line => line.length))
  };
  
  analysis.avgWordsPerLine = Math.round(analysis.words / analysis.lines);
  
  // Language-specific analysis
  const fileInfo = hiliner.getFileInfo();
  let specialMetrics = '';
  
  if (fileInfo.language === 'javascript') {
    const jsPatterns = {
      functions: (text.match(/function\s+\w+|=>\s*[{(]/g) || []).length,
      variables: (text.match(/(?:const|let|var)\s+\w+/g) || []).length,
      comments: (text.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length
    };
    specialMetrics = ` | JS: ${jsPatterns.functions} functions, ${jsPatterns.variables} vars`;
  }
  
  const summary = `📝 Selection: ${analysis.words} words, ${analysis.chars} chars, ${analysis.sentences} sentences${specialMetrics}`;
  hiliner.updateStatus(summary);
  
  console.log('Detailed Analysis:', analysis);
  
} catch (error) {
  hiliner.updateStatus(`❌ Selection analysis failed: ${error.message}`);
}
```

### 4. File System Integration Scripts

**Directory context analyzer:**
```javascript
/**
 * Directory Context Analyzer
 */

const fs = require('fs');
const path = require('path');

try {
  hiliner.updateStatus('📁 Analyzing directory context...');
  
  const fileInfo = hiliner.getFileInfo();
  const currentDir = path.dirname(fileInfo.path);
  const currentFile = path.basename(fileInfo.path);
  const currentExt = path.extname(currentFile);
  
  // Read directory contents
  const allFiles = fs.readdirSync(currentDir);
  const stats = fs.statSync(fileInfo.path);
  
  // Analyze directory
  const analysis = {
    totalFiles: allFiles.length,
    sameExtension: allFiles.filter(f => path.extname(f) === currentExt).length,
    directories: allFiles.filter(f => {
      try {
        return fs.statSync(path.join(currentDir, f)).isDirectory();
      } catch { return false; }
    }).length,
    currentFileSize: stats.size,
    currentFileModified: stats.mtime
  };
  
  // Find related files
  const basename = path.basename(currentFile, currentExt);
  const relatedFiles = allFiles.filter(f => {
    const otherBase = path.basename(f, path.extname(f));
    return otherBase === basename && f !== currentFile;
  });
  
  let summary = `📁 Dir: ${analysis.totalFiles} files, ${analysis.sameExtension} ${currentExt} files`;
  if (relatedFiles.length > 0) {
    summary += `, ${relatedFiles.length} related files`;
  }
  
  hiliner.updateStatus(summary);
  
  console.log('Directory Analysis:', analysis);
  console.log('Related files:', relatedFiles);
  
} catch (error) {
  hiliner.updateStatus(`❌ Directory analysis failed: ${error.message}`);
}
```

**Backup file creator:**
```javascript
/**
 * Backup File Creator
 */

const fs = require('fs');
const path = require('path');

try {
  const fileInfo = hiliner.getFileInfo();
  const originalPath = fileInfo.path;
  const dir = path.dirname(originalPath);
  const name = path.basename(originalPath, path.extname(originalPath));
  const ext = path.extname(originalPath);
  
  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `${name}.backup.${timestamp}${ext}`;
  const backupPath = path.join(dir, backupName);
  
  hiliner.updateStatus('💾 Creating backup...');
  
  // Copy file
  fs.copyFileSync(originalPath, backupPath);
  
  // Verify backup
  const originalStats = fs.statSync(originalPath);
  const backupStats = fs.statSync(backupPath);
  
  if (originalStats.size === backupStats.size) {
    hiliner.updateStatus(`✅ Backup created: ${backupName}`);
    console.log(`Backup saved to: ${backupPath}`);
  } else {
    hiliner.updateStatus('❌ Backup verification failed');
  }
  
} catch (error) {
  hiliner.updateStatus(`❌ Backup failed: ${error.message}`);
}
```

### 5. Integration Scripts

**Git status integration:**
```javascript
/**
 * Git Status Integration
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  const fileInfo = hiliner.getFileInfo();
  const dir = path.dirname(fileInfo.path);
  const fileName = path.basename(fileInfo.path);
  
  hiliner.updateStatus('🔄 Checking git status...');
  
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'ignore' });
  } catch {
    hiliner.updateStatus('❌ Not in a git repository');
    return;
  }
  
  // Get file status
  const gitStatus = execSync(`git status --porcelain "${fileName}"`, { 
    cwd: dir, 
    encoding: 'utf-8' 
  }).trim();
  
  // Get commit info
  let lastCommit = '';
  try {
    lastCommit = execSync(`git log -1 --oneline "${fileName}"`, {
      cwd: dir,
      encoding: 'utf-8'
    }).trim();
  } catch {
    lastCommit = 'No commits found';
  }
  
  // Interpret status
  let status = 'Clean';
  if (gitStatus) {
    const statusCode = gitStatus.substring(0, 2);
    const statusMap = {
      'M ': 'Modified (staged)',
      ' M': 'Modified (unstaged)', 
      'A ': 'Added (staged)',
      '??': 'Untracked',
      'D ': 'Deleted (staged)',
      ' D': 'Deleted (unstaged)'
    };
    status = statusMap[statusCode] || 'Unknown status';
  }
  
  hiliner.updateStatus(`🔄 Git: ${status} | Last: ${lastCommit.split(' ')[0]}`);
  console.log('Full commit info:', lastCommit);
  
} catch (error) {
  hiliner.updateStatus(`❌ Git check failed: ${error.message}`);
}
```

### 6. Utility Functions Library

**Common helper functions:**
```javascript
/**
 * Utility Functions for Hiliner Scripts
 */

// File size formatter
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Text statistics calculator
function calculateTextStats(text) {
  const lines = text.split('\n');
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    lines: lines.length,
    words: words.length,
    chars: text.length,
    charsNoSpaces: text.replace(/\s/g, '').length,
    sentences: sentences.length,
    avgWordsPerLine: Math.round(words.length / lines.length),
    avgWordsPerSentence: Math.round(words.length / sentences.length),
    longestLine: Math.max(...lines.map(line => line.length)),
    shortestLine: Math.min(...lines.map(line => line.length))
  };
}

// Language-specific pattern matching
function analyzeCodePatterns(content, language) {
  const patterns = {
    javascript: {
      functions: /(?:function\s+\w+|const\s+\w+\s*=.*=>|class\s+\w+)/g,
      comments: /(?:\/\/.*|\/\*[\s\S]*?\*\/)/g,
      imports: /(?:import\s+.*from|require\s*\()/g
    },
    python: {
      functions: /def\s+\w+/g,
      comments: /#.*/g,
      imports: /(?:import\s+\w+|from\s+\w+\s+import)/g
    }
  };
  
  const langPatterns = patterns[language];
  if (!langPatterns) return null;
  
  const results = {};
  for (const [type, pattern] of Object.entries(langPatterns)) {
    results[type] = (content.match(pattern) || []).length;
  }
  
  return results;
}

// Safe file operations with error handling
function safeFileOperation(operation, filePath, ...args) {
  const fs = require('fs');
  
  try {
    switch (operation) {
      case 'read':
        return fs.readFileSync(filePath, 'utf-8');
      case 'write':
        return fs.writeFileSync(filePath, args[0], 'utf-8');
      case 'exists':
        return fs.existsSync(filePath);
      case 'stat':
        return fs.statSync(filePath);
      case 'copy':
        return fs.copyFileSync(filePath, args[0]);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    hiliner.updateStatus(`❌ File operation '${operation}' failed: ${error.message}`);
    throw error;
  }
}

// Progress tracker for long operations
class ProgressTracker {
  constructor(total, operation = 'Processing') {
    this.total = total;
    this.current = 0;
    this.operation = operation;
    this.lastUpdate = 0;
  }
  
  update(increment = 1) {
    this.current += increment;
    const percent = Math.round((this.current / this.total) * 100);
    
    // Update every 5% or every 100 items
    if (percent >= this.lastUpdate + 5 || this.current % 100 === 0) {
      hiliner.updateStatus(`⏳ ${this.operation}: ${percent}% (${this.current}/${this.total})`);
      this.lastUpdate = percent;
    }
  }
  
  complete() {
    hiliner.updateStatus(`✅ ${this.operation} complete: ${this.current}/${this.total}`);
  }
}

// Example usage of utilities
try {
  const fileInfo = hiliner.getFileInfo();
  const content = safeFileOperation('read', fileInfo.path);
  const stats = calculateTextStats(content);
  
  hiliner.updateStatus(`📊 ${stats.words} words, ${stats.lines} lines`);
  
} catch (error) {
  // Error already handled by safeFileOperation
}
```

## AI Agent Best Practices

### 1. Script Template Selection
- **Simple operations**: Use inline JavaScript in actions
- **File analysis**: Use dedicated analysis scripts
- **External integration**: Use separate integration scripts
- **Utility functions**: Create reusable helper modules

### 2. Error Handling Strategy
```javascript
// Always wrap in try-catch
try {
  // Validate environment first
  // Process with progress updates
  // Provide detailed success feedback
} catch (error) {
  // User-friendly error in status bar
  // Detailed error in console for debugging
}
```

### 3. User Experience Guidelines
- Start with processing status (`⏳`)
- Provide progress for long operations
- Use consistent emoji icons (`✅` `❌` `📊` `📁`)
- Keep status messages concise but informative
- Log detailed information to console

### 4. Common Script Categories

**Analysis Scripts:**
- File statistics and metrics
- Code complexity analysis
- Content pattern matching
- Directory context analysis

**Automation Scripts:**
- Code formatting and linting
- Documentation generation
- Batch file operations
- Template generation

**Integration Scripts:**
- Git repository operations
- External editor integration
- Build tool integration
- API interactions

This guide provides comprehensive patterns for AI agents to help users create effective, maintainable scripts for Hiliner.