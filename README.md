# Hiliner

An interactive CLI file viewer built with Ink (React for CLI) providing a full-screen terminal-based file browser with advanced syntax highlighting and navigation features.

## Features

### Interactive File Viewing
- **Full-screen terminal interface**: Optimized for seamless file browsing
- **Keyboard navigation**: Vim-style shortcuts for efficient navigation
- **Multi-line selection**: Advanced selection system with visual indicators

### Syntax Highlighting
- **Automatic language detection**: Uses VS Code's machine learning model for accurate language detection
- **50+ programming languages**: JavaScript, Python, TypeScript, Rust, Go, Java, C++, and many more
- **60+ themes available**: Choose from the full collection of [Shiki bundled themes](https://shiki.style/themes)
- **Terminal-optimized rendering**: ANSI escape sequences for fast, colorful display
- **Fallback support**: Graceful degradation to plain text when highlighting fails
- **Performance optimized**: Viewport-limited processing with 50MB cache for smooth scrolling

### Multi-Selection Support
- Select multiple lines for visual highlighting and reference
- Visual indicators show selected line numbers in the status bar
- Keyboard shortcuts for efficient selection management

### Status Bar Information
- Current line and column position
- File size and total lines
- Active syntax highlighting theme (when applicable)
- Selected line count (when multi-selection is active)

### Terminal Navigation
- Vim-style navigation (arrow keys, page up/down, go to start/end)
- Smooth scrolling with viewport management
- iTerm2 optimized display to prevent screen flickering

## Installation

```bash
npm install -g hiliner
```

Or for local development:

```bash
git clone <repository-url>
cd hiliner
npm install
npm run build
```

## Usage

Launch the interactive file viewer:

```bash
hiliner path/to/file.txt

# With custom theme
hiliner --theme github-light path/to/file.txt
hiliner -t monokai path/to/file.txt
hiliner --theme dracula path/to/file.txt
```

## Keyboard Shortcuts

### Built-in Navigation
| Key | Action |
|-----|--------|
| `↑` `↓` `j` `k` | Move cursor up/down one line |
| `b` | Page up (viewport height - 1) |
| `f` | Page down (viewport height - 1) |
| `g` | Go to start of file |
| `G` | Go to end of file |
| `q` | Quit application |

### Built-in Multi-Selection
| Key | Action |
|-----|--------|
| `Tab` | Toggle selection of current line |
| `Shift+Tab` | Range selection from previously selected line |
| `a` | Select all visible lines (within current viewport) |
| `c` | Clear all selections |

### Built-in File Operations  
| Key | Action |
|-----|--------|
| `r` | Reload current file |
| `?` | Show help and key bindings |

### Custom Actions (Example)
Use `hiliner --keymap` to see your complete keymap including custom actions.

| Key | Action | Source |
|-----|--------|--------|
| `y` | Copy Selected Text | clipboard.json |
| `p` | Copy File Path | clipboard.json |
| `e` | Open in VS Code | development.json |
| `h` | JavaScript Hello | javascript-test.json |

**Note:** Custom action keys depend on your configuration files in the `actions/` directory.

## Multi-Selection Feature

The multi-selection feature allows you to highlight and track multiple lines while browsing files:

### Visual Indicators
- **Selected lines**: Display with highlighted background
- **Status bar**: Shows count of selected lines (e.g., "3 selected")
- **Line numbers**: Selected lines are visually distinct

### Selection Modes
- **Individual selection**: Use `Tab` to toggle selection of the current line
- **Viewport selection**: Use `a` to select all currently visible lines
- **Clear selection**: Use `d` or `Escape` to deselect all lines

### Use Cases
- Code review: Mark lines of interest for discussion
- Documentation: Highlight important sections while reading
- Debugging: Track multiple error locations or relevant code sections
- Reference: Mark key lines while navigating large files

## Custom Action System

Hiliner supports a powerful custom action system that allows you to create personalized commands and scripts to enhance your file viewing experience.

### Quick Start

1. **View Available Actions**: See all built-in and custom key bindings
   ```bash
   hiliner --keymap
   ```

2. **Create Action Directory**: Set up your custom actions
   ```bash
   mkdir actions
   ```

3. **Add Custom Actions**: Create JSON configuration files
   ```json
   {
     "$schema": "./src/schemas/actionConfig.schema.json",
     "version": "1.0.0",
     "actions": [
       {
         "id": "copy-path",
         "name": "Copy File Path",
         "description": "Copy current file path to clipboard",
         "key": "p",
         "script": "echo \"$FILE_PATH\" | pbcopy && echo \"Copied: $FILE_PATH\""
       }
     ]
   }
   ```

4. **Use Your Actions**: Press your custom key bindings in interactive mode
   ```bash
   hiliner file.js  # Then press 'p' to copy file path
   ```

### Configuration Structure

**Directory Layout:**
```
your-project/
├── actions/           # Auto-loaded custom actions
│   ├── clipboard.json
│   ├── development.json
│   └── analysis.json
└── scripts/           # External JavaScript files
    └── javascript/
        ├── analyze.js
        └── transform.js
```

**JSON Configuration Format:**
```json
{
  "$schema": "./src/schemas/actionConfig.schema.json",
  "version": "1.0.0",
  "actions": [
    {
      "id": "unique-action-id",
      "name": "Display Name",
      "description": "What this action does",
      "key": "x",
      "script": "command to execute",
      "when": {
        "hasSelection": true
      }
    }
  ]
}
```

### Action Types

**1. Shell Commands:**
```json
{
  "id": "open-editor",
  "key": "e",
  "script": "code \"$FILE_PATH\""
}
```

**2. JavaScript Scripts:**
```json
{
  "id": "hello-js",
  "key": "h",
  "script": "hiliner.updateStatus('Hello from JavaScript!');"
}
```

**3. External JavaScript Files:**
```json
{
  "id": "complex-analysis",
  "key": "a",
  "script": "scripts/javascript/analyze.js"
}
```

### Environment Variables

Your scripts have access to these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `$SELECTED_TEXT` | Content of selected lines | "line1\nline2\nline3" |
| `$FILE_PATH` | Absolute path to current file | "/Users/name/project/file.js" |
| `$LINE_START` | First line number in selection | "5" |
| `$LINE_END` | Last line number in selection | "10" |
| `$LANGUAGE` | Detected programming language | "javascript" |
| `$SELECTION_COUNT` | Number of selected lines | "6" |
| `$TOTAL_LINES` | Total lines in file | "150" |
| `$CURRENT_LINE` | Current cursor position | "25" |

### JavaScript API

For JavaScript scripts, use the `hiliner` global object:

```javascript
// Update status bar
hiliner.updateStatus('Processing complete!');

// Get file information
const info = hiliner.getFileInfo();
console.log(`File: ${info.path} (${info.totalLines} lines)`);

// Get selection information  
const selection = hiliner.getSelectionInfo();
hiliner.updateStatus(`Selected ${selection.selectionCount} lines`);

// Clear status bar
hiliner.clearStatus();
```

### Example Configurations

**Clipboard Operations (`actions/clipboard.json`):**
```json
{
  "version": "1.0.0",
  "actions": [
    {
      "id": "copy-selected",
      "name": "Copy Selected Text",
      "key": "y",
      "script": "echo \"$SELECTED_TEXT\" | pbcopy",
      "when": { "hasSelection": true }
    },
    {
      "id": "copy-path",
      "name": "Copy File Path",
      "key": "p",
      "script": "echo \"$FILE_PATH\" | pbcopy"
    }
  ]
}
```

**Development Tools (`actions/development.json`):**
```json
{
  "version": "1.0.0", 
  "actions": [
    {
      "id": "open-vscode",
      "name": "Open in VS Code",
      "key": "e",
      "script": "code \"$FILE_PATH\""
    },
    {
      "id": "run-tests",
      "name": "Run Tests",
      "key": "t",
      "script": "npm test"
    }
  ]
}
```

**JavaScript Analysis (`actions/analysis.json`):**
```json
{
  "version": "1.0.0",
  "actions": [
    {
      "id": "file-stats",
      "name": "File Statistics",
      "key": "s",
      "script": "scripts/javascript/file-stats.js"
    }
  ]
}
```

**External JavaScript Example (`scripts/javascript/file-stats.js`):**
```javascript
const fs = require('fs');
const fileInfo = hiliner.getFileInfo();

try {
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  
  const stats = {
    totalLines: lines.length,
    nonEmpty: lines.filter(l => l.trim()).length,
    comments: lines.filter(l => l.trim().startsWith('//')).length
  };
  
  hiliner.updateStatus(
    `📊 ${stats.nonEmpty}/${stats.totalLines} lines, ${stats.comments} comments`
  );
} catch (error) {
  hiliner.updateStatus(`❌ Error: ${error.message}`);
}
```

### Conditional Actions

Use the `when` clause to control when actions are available:

```json
{
  "id": "copy-selection",
  "key": "c",
  "script": "echo \"$SELECTED_TEXT\" | pbcopy",
  "when": {
    "hasSelection": true
  }
}
```

### Usage Examples

```bash
# View complete keymap including your custom actions
hiliner --keymap

# Use custom config file
hiliner --config my-actions.json file.txt

# Debug mode to see action loading
hiliner --debug file.txt
```

## Command Line Options

### Global Options
```
-h, --help             Show help message
-v, --version          Show version information
-k, --keymap           Show complete keymap (built-in + custom actions)
-c, --config <path>    Path to custom action configuration file
-t, --theme <name>     Set syntax highlighting theme (default: dark-plus)
--debug                Enable debug mode
```

### Static Mode Options
```
--no-line-numbers      Hide line numbers
--marker <string>      Custom line marker (default: ">>>")
--context <number>     Lines of context around highlighted lines
--relative             Use relative line numbering
-t, --theme <name>     Set syntax highlighting theme (also available in interactive mode)
```

## Examples

### Interactive Mode Examples

```bash
# Browse a configuration file
hiliner config/app.json

# View source code with custom actions
hiliner src/components/App.tsx
# Use Tab to select lines of interest
# Use 'y' to copy selected text (if configured)
# Use 'p' to copy file path (if configured)
# Use 'e' to open in VS Code (if configured)

# Use custom configuration
hiliner --config my-actions.json src/app.js

# View all available key bindings
hiliner --keymap
```

### Static Mode Examples

```bash
# CI/CD: Highlight failed test lines with syntax highlighting
hiliner test-output.log 45-67 --marker "FAIL"

# Code review: Show specific TypeScript changes with syntax colors
hiliner src/utils.ts 120-125,140,155-160

# Documentation: Extract key sections from Markdown with highlighting
hiliner README.md 1-10,50-60 --context 2

# View Python function with syntax highlighting and custom marker
hiliner app.py 25-45 --marker ">>>"
```

### Syntax Highlighting Examples

```bash
# Interactive mode with automatic language detection
hiliner src/main.rs                    # Rust syntax highlighting
hiliner components/App.tsx              # TypeScript/JSX highlighting
hiliner api/server.py                   # Python highlighting

# Interactive mode with custom themes
hiliner --theme dracula src/main.rs     # Rust with Dracula theme
hiliner -t monokai components/App.tsx   # TypeScript with Monokai theme
hiliner --theme github-dark api/server.py # Python with GitHub Dark theme
```

### Theme Switching

Hiliner supports 60+ syntax highlighting themes from the [Shiki theme collection](https://shiki.style/themes). Use the `--theme` or `-t` option to specify a theme:

```bash
# Popular themes
hiliner --theme dark-plus file.js       # VS Code Dark+ (default)
hiliner --theme monokai file.py         # Monokai
hiliner --theme dracula file.rs         # Dracula
hiliner --theme github-dark file.go     # GitHub Dark
hiliner --theme one-dark-pro file.ts    # One Dark Pro

# Light themes
hiliner --theme light-plus file.js      # VS Code Light+
hiliner --theme github-light file.py    # GitHub Light
hiliner --theme catppuccin-latte file.rs # Catppuccin Latte

# Works in both interactive and static modes
hiliner --theme nord file.txt           # Interactive with Nord theme
hiliner --theme solarized-dark # Static with Solarized Dark
```

**Theme Requirements**:
- Theme names are case-sensitive and must match exactly (lowercase with hyphens)
- Invalid theme names will display a warning and fall back to the default `dark-plus` theme
- In interactive mode, the current theme name is displayed in the status bar
- For the complete list of available themes, visit the [Shiki themes page](https://shiki.style/themes)

**Error Handling**:
```bash
# Invalid theme example
hiliner --theme invalid-theme file.js
# Warning: Theme 'invalid-theme' not found. Using default theme 'dark-plus'.
```

## File Support

### Supported File Types
Hiliner automatically detects and provides syntax highlighting for:

- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`
- **Rust**: `.rs`
- **Go**: `.go`
- **Java**: `.java`
- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **C#**: `.cs`
- **PHP**: `.php`
- **Ruby**: `.rb`
- **Swift**: `.swift`
- **Kotlin**: `.kt`
- **Scala**: `.scala`
- **Shell scripts**: `.sh`, `.bash`, `.zsh`, `.fish`
- **Web technologies**: `.html`, `.css`, `.scss`, `.json`, `.xml`, `.yaml`
- **Configuration files**: `.toml`, `.ini`, `.dockerfile`
- **Documentation**: `.md`, `.rst`
- **And many more...**

For files without extensions or unknown types, hiliner uses content-based language detection.

### File Size Limits
- Default maximum: 10MB
- Configurable via environment or options
- Memory-efficient streaming for large files

### Binary File Handling
- Automatic detection of binary files
- Graceful fallback with informative message
- File type detection based on extension and content

## Development

### Building the Project

```bash
npm run build          # Compile TypeScript to dist/
npm run typecheck      # Type checking without compilation
npm run lint           # ESLint with TypeScript and React rules  
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Prettier formatting
```

### Testing

```bash
npm test               # Run all tests (Jest with ts-jest)
npm run test:watch     # Watch mode for development
npm run test:coverage  # Coverage report with 80% threshold
```

### Running Development Build

```bash
npm run build && node bin/hiliner.js path/to/file.txt
```

## Architecture

### Core Components
- **CLI Entry Point** (`src/cli.ts`): Argument parsing and mode detection
- **Interactive UI** (`src/components/`): Ink React components for terminal rendering
- **File Loading** (`src/utils/fileLoader.ts`): Optimized file operations with validation
- **Multi-Selection** (`src/hooks/useSelection.ts`): State management for line selection

### Performance Features
- Single text block rendering to prevent DOM fragmentation
- React.memo usage to minimize re-renders
- iTerm2 compatibility with height constraints
- Throttled keyboard input handling
- Memory-efficient file loading with size limits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding guidelines
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Run linting and formatting (`npm run lint:fix && npm run format`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.2.0 (Current)
- **🚀 Custom Action System**: Powerful scripting framework for personalized workflows
  - JSON-based action configuration with automatic loading from `actions/` directory
  - Support for shell commands, inline JavaScript, and external JavaScript files
  - 8 environment variables (`$SELECTED_TEXT`, `$FILE_PATH`, etc.) for context-aware scripting
  - JavaScript API (`hiliner.updateStatus()`, `hiliner.getFileInfo()`, etc.) for UI integration
  - Conditional actions with `when` clauses (e.g., `hasSelection: true`)
  - Schema validation and key binding conflict detection
- **🗺️ Enhanced Help System**: Complete keymap visualization
  - `--keymap` command line option to display all available key bindings
  - Categorized display showing built-in and custom actions with source files
  - Improved formatting with proper alignment and arrow symbols (↑↓)
- **⚡ Performance Improvements**: Streamlined key bindings and UI optimizations
  - Removed redundant PageUp/PageDown alternative key bindings
  - Optimized action execution pipeline with operation IDs to prevent race conditions
- **🔧 Developer Experience**: Enhanced configuration and debugging capabilities
  - `--config` option for custom action configuration files
  - `--debug` mode for action system troubleshooting
  - External script file support with automatic API injection

### v0.1.0
- Initial release with interactive and static modes
- **Syntax highlighting** for 50+ programming languages using Shiki and VS Code language detection
- **Automatic language detection** with ML-based content analysis and file extension mapping
- **Terminal-optimized rendering** with ANSI escape sequences for fast display
- **Performance optimization** with viewport-limited processing and 50MB caching system
- Multi-selection functionality with keyboard shortcuts
- Optimized terminal rendering and navigation
- File loading with validation and error handling
- Comprehensive test coverage with end-to-end testing