function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const message = "Hello, world!";
console.log(message);

// Test different syntax elements
const numbers = [1, 2, 3, 4, 5];
const result = numbers.map(x => x * 2);

class Calculator {
  add(a, b) {
    return a + b;
  }
  
  subtract(a, b) {
    return a - b;
  }
}

export { fibonacci, Calculator };