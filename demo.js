console.log('This is a test file');
const message = 'Hello, World!';
let counter = 0;

function increment() {
  return ++counter;
}

class TestClass {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    console.log(`Hello, ${this.name}!`);
  }
}

// Sample usage
const test = new TestClass('hiliner');
test.greet();
console.log(increment());
