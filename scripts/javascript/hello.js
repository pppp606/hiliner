/**
 * Simple hello script demonstrating hiliner API usage
 */

// Display greeting message
hiliner.updateStatus('Hello from External JavaScript File!');

// You can add more complex logic here
const fileInfo = hiliner.getFileInfo();
console.log(`Processing file: ${fileInfo.path}`);

// Example of async operations (for future use)
// setTimeout(() => {
//   hiliner.updateStatus('Delayed message from script');
// }, 2000);