/**
 * Complex example demonstrating advanced JavaScript operations
 */

const fs = require('fs');
const path = require('path');

try {
  // Get current file info
  const fileInfo = hiliner.getFileInfo();
  
  // Read the current file content
  const fileContent = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Analyze content
  const stats = {
    totalLines: lines.length,
    nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
    commentLines: lines.filter(line => line.trim().startsWith('//')).length,
    functionCount: (fileContent.match(/function\s+\w+/g) || []).length,
    classCount: (fileContent.match(/class\s+\w+/g) || []).length
  };
  
  // Generate summary
  const summary = `📈 Analysis: ${stats.nonEmptyLines}/${stats.totalLines} lines, ${stats.functionCount} functions, ${stats.classCount} classes`;
  
  hiliner.updateStatus(summary);
  
  console.log('Full statistics:', JSON.stringify(stats, null, 2));
  
} catch (error) {
  hiliner.updateStatus(`❌ Error: ${error.message}`);
  console.error('Script error:', error);
}