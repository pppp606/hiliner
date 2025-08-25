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
-t, --theme <name>     Set syntax highlighting theme (default: dark-plus)
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

# View source code with multi-selection
hiliner src/components/App.tsx
# Use Tab to select lines of interest
# Use 'a' to select all visible functions
# Use 'd' to clear selections when done
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

# Static mode preserves syntax colors in output
hiliner main.go 1-20 > highlighted.txt         # Go syntax with line numbers
hiliner script.sh 10+5 --theme one-dark-pro   # Shell script with theme and context
hiliner config.json 1-30 --theme catppuccin-mocha # JSON with Catppuccin theme
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
hiliner file.txt 1-10 --theme solarized-dark # Static with Solarized Dark
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