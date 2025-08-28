/**
 * File analysis script demonstrating complex operations
 */

const fileInfo = hiliner.getFileInfo();
const selectionInfo = hiliner.getSelectionInfo();

// Analyze the file
let analysis = `📊 File Analysis:\n`;
analysis += `• Path: ${fileInfo.path}\n`;
analysis += `• Language: ${fileInfo.language}\n`;
analysis += `• Total Lines: ${fileInfo.totalLines}\n`;
analysis += `• Current Line: ${fileInfo.currentLine}\n`;

if (selectionInfo.selectionCount > 0) {
  analysis += `• Selected: ${selectionInfo.selectionCount} lines (${selectionInfo.selectedText.length} chars)`;
} else {
  analysis += `• No selection`;
}

// Display the analysis
hiliner.updateStatus(analysis.split('\n')[1]); // Show first detail line for now

// Log full analysis to console for debugging
console.log(analysis);