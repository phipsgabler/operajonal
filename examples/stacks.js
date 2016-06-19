'use strict';

const {Program, makeInstructions} = require('../index.js');


// Defining the instructions we want to provide:
const StackInstr = makeInstructions({
  Push: ['value'],
  Pop: [],
  Add: []
});

const {Push, Pop, Add} = StackInstr;


// A test program operating on stacks: (needs to be lazy, because we can't reuse a generator)
const testProgram1 = () => Program.do(function*() {
  yield Push(10);
  yield Push(20);
  yield Add;
  yield Push(33);
  let thirtyTwo = yield Pop;
  let sum = yield Pop;
  return `last element: ${thirtyTwo}, sum of previous: ${sum}`;
});

// the same thing in "verbose syntax":
// const testProgram2 = Push(10).andThen(Push(20))
//     .andThen(Add())
//     .andThen(Push(33))
//     .andThen(Pop()).flatMap(
//         thirtyTwo => Pop().flatMap(
//             sum => Program.inject([sum, thirtyTwo])));


// an interpreter, which will execute a stack program on an immutable list
const interpreter1 = (program, initialStack) => Program.interpret(program)({
  Pop: recur => {
    const [first, ...rest] = initialStack;
    return interpreter1(recur(first), rest);
  },
  Push: (recur, x) => interpreter1(recur({}), [x, ...initialStack]),
  Add: recur => {
    const [first, second, ...rest] = initialStack;
    const sum = first + second;
    return interpreter1(recur(sum), [sum, ...rest]);
  }
});

console.log(interpreter1(testProgram1(), []));
// expected: `last element: 33, sum of previous: 30`


// an interpreter mutating an array:
function interpreter2(program) {
  const stack = [];

  const go = p =>  Program.interpret(p)({
    Pop: recur => {
      const x = stack.pop();
      return go(recur(x));
    },
    Push: (recur, x) => {
      stack.push(x);
      return go(recur({}));
    },
    Add: recur => {
      const first = stack.pop();
      const second = stack.pop();
      const sum = first + second;
      stack.push(sum);
      return go(recur({}));
    }
  });

  return go(program);
}

console.log(interpreter2(testProgram1()));
// expected: `last element: 33, sum of previous: 30`

