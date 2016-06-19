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
const testProgram = () => Program.do(function*() {
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


(function test1() {
  // An immutable interpreter, which will execute a stack program on an immutable list
  const interpreter = (program, initialStack) => Program.interpret(program)({
    Pop: recur => {
      const [first, ...rest] = initialStack;
      return interpreter(recur(first), rest);
    },
    Push: (recur, x) => interpreter(recur({}), [x, ...initialStack]),
    Add: recur => {
      const [first, second, ...rest] = initialStack;
      const sum = first + second;
      return interpreter(recur(sum), [sum, ...rest]);
    }
  });

  console.log(interpreter(testProgram(), []));
  // expected: `last element: 33, sum of previous: 30`
})();

(function test2() {
  // an interpreter mutating an array:

  function interpreter(program) {
    const stack = [];

    const go = p => Program.interpret(p)({
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

  console.log(interpreter(testProgram()));
  // expected: `last element: 33, sum of previous: 30`
})();

(function test3() {
  // An interpreter into the State monad. Immutable, and eta-equivalent to test1.

  class State {
    constructor(run) {
      this.run = run;
    }

    static of(x) {
      return new State(s => [x, s]);
    }

    map(f) {
      return new State(s => {
        const [result, s_prime] = this.run(s);
        return [f(result), s_prime];
      });
    }

    chain(f) {
      return new State(s => {
        const [result, s_prime] = this.run(s);
        return f(result).run(s_prime);
      });
    }

    andThen(k) {
      return this.chain(_ => k);
    }

    static get() {
      return new State(s => [s, s]);
    }

    static put(new_s) {
      return new State(_ => [{}, new_s]);
    }

    static modify(f) {
      return State.get().chain(x => State.put(f(x)));
    }
  }

  function interpreter(program) {
    return Program.interpretMonadic(program)({
      Return: State.of,
      Pop: () => State.get().chain(stack => {
        const [first, ...rest] = stack;
        return State.put(rest).andThen(State.of(first));
      }),
      Push: (x) => State.modify(stack => [x, ...stack]),
      Add: () => State.get().chain(stack => {
        const [first, second, ...rest] = stack;
        const sum = first + second;
        return State.put([sum, ...rest]).andThen(State.of(sum));
      })
    });
  }

  // we run this with a stack already containing a value, which should be kept untouched
  console.log(interpreter(testProgram()).run([666]));
  // expected: [ 'last element: 33, sum of previous: 30', [ 666 ] ]
})();

