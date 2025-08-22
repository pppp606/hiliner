# Hiliner

An interactive CLI file viewer built with Ink (React for CLI) that transforms from a static line highlighting tool to an interactive terminal-based file browser. Hiliner operates in two modes to provide both interactive browsing and scriptable text processing capabilities.

## Features

### Dual-Mode Operation
- **Interactive Mode** (default): Full-screen terminal viewer with keyboard navigation and multi-selection
- **Static Mode**: Legacy line highlighting functionality for CI/CD and scripting

### Multi-Selection Support
- Select multiple lines for visual highlighting and reference
- Visual indicators show selected line numbers in the status bar
- Keyboard shortcuts for efficient selection management

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

### Interactive Mode

Launch the interactive file viewer:

```bash
hiliner path/to/file.txt
```

### Static Mode

Highlight specific lines for scripting and CI/CD:

```bash
# Highlight single line
hiliner file.txt 15

# Highlight line range
hiliner file.txt 10-20

# Highlight multiple ranges
hiliner file.txt 5-8,15,20-25

# Highlight with context
hiliner file.txt 15+3    # Line 15 with 3 lines context

# Additional options
hiliner file.txt 10-20 --no-line-numbers
hiliner file.txt 15 --marker ">>>"
```

## Interactive Mode Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `↑` `↓` | Move cursor up/down one line |
| `←` `→` | Scroll horizontally |
| `Space` `Page Down` | Page down (viewport height - 1) |
| `b` `Page Up` | Page up (viewport height - 1) |
| `g` | Go to start of file |
| `G` | Go to end of file |

### Multi-Selection
| Key | Action |
|-----|--------|
| `Tab` | Toggle selection of current line |
| `a` | Select all visible lines (within current viewport) |
| `d` | Deselect all lines |
| `Escape` | Clear all selections |

### Application Control
| Key | Action |
|-----|--------|
| `q` | Quit application |
| `Ctrl+C` | Force quit |

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

## Command Line Options

### Global Options
```
-h, --help             Show help message
-v, --version          Show version information
--static               Force static mode (disable interactive)
```

### Static Mode Options
```
--no-line-numbers      Hide line numbers
--marker <string>      Custom line marker (default: ">>>")
--context <number>     Lines of context around highlighted lines
--relative             Use relative line numbering
```

## Examples

### Interactive Mode Examples

```bash
# Browse a configuration file
hiliner config/app.json

# View source code with multi-selection
hiliner src/components/App.tsx
# Use Tab to select lines of interest
# Use 'a' to select all visible functions
# Use 'd' to clear selections when done
```

### Static Mode Examples

```bash
# CI/CD: Highlight failed test lines
hiliner test-output.log 45-67 --marker "FAIL"

# Code review: Show specific changes
hiliner src/utils.ts 120-125,140,155-160

# Documentation: Extract key sections
hiliner README.md 1-10,50-60 --context 2
```

## File Support

### Supported File Types
- Text files (`.txt`, `.md`, `.json`, `.yaml`, etc.)
- Source code (`.js`, `.ts`, `.py`, `.go`, `.rs`, etc.)
- Configuration files
- Log files
- Any UTF-8 encoded text file

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

### v0.1.0
- Initial release with interactive and static modes
- Multi-selection functionality with keyboard shortcuts
- Optimized terminal rendering and navigation
- File loading with validation and error handling
- Comprehensive test coverage