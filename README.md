# Operajonal #

This package implements a style of free monads which is identical to
[`operational`](http://hackage.haskell.org/package/operational-0.2.3.2/docs/Control-Monad-Operational.html),
a Haskell package by Heinrich Apfelmus. The biggest difference to other variants of free monads is that
it uses an intermediate representation for the continuation structure, instead of only `Pure` and `Impure`, which
can be transformed into the "classical" form, which is here called `ProgramView`.

This leaves the possibility to write recursive interpreters directly over views, instead of always having to
transform commands into a monadic representation (I think this can be more confusing to beginners). However,
monadic interpretation is still supported.

Additionally, a "do notation" hack via generator functions is provided. Also, it makes much use of 
[`daggy`](https://github.com/puffnfresh/daggy) to automatically produce nicely usable sum types and allow for
some pattern-matching-like syntax.

## Installation ##

Currently, only

```
npm install https://github.com/phipsgabler/operajonal.git
```

## Example 1: Stacks ##

Can be found in [examples/stacks.js](./examples/stacks.js). Basically, a clone of the stack interpreter
example from `operational`, but with an additional command `Add`. First, we need to define the
commands we are going to use:

```{JavaScript}
const StackInstr = makeInstructions({
  Push: ['value'],
  Pop: [],
  Add: []
});

const {Push, Pop, Add} = StackInstr;
```

Under the hood, `makeInstructions` produces a `daggy` sum type and wraps its constructors into the `Instr` 
constructor of `Program`, the internal representation.

Now, suppose this is the monadic program we want to run:

```{JavaScript}
Push(10).andThen(Push(20))
    .andThen(Add())
    .andThen(Push(33))
    .andThen(Pop()).chain(
        thirtyTwo => Pop().chain(
            sum => Program.inject([sum, thirtyTwo])));
```

For convenience, we can also write that in do-notation:

```{JavaScript}
const testProgram = Program.do(function*() {
  yield Push(10);
  yield Push(20);
  yield Add;
  yield Push(33);
  let thirtyTwo = yield Pop;
  let sum = yield Pop;
  return `last element: ${thirtyTwo}, sum of previous: ${sum}`;
});
```

Given this, we can write a simple recursive interpreter for it. We do not need to manually deal with views, but
can directly give a catamorphism to the `interpret` method of `Program`:

```{JavaScript}
const interpreter = (program, initialStack) => program.interpret({
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
```

For every instruction, we provide a case function taking the current continuation (here called `recur`), and the 
properties of the instruction. The function should do whatever interpretation is necessary, then call the 
continuation on the result, and recursively interpret the new program.

This interpreter can be run with 

```{JavaScript}
console.log(interpreter(testProgram(), []));
```

and should produce the result

```
last element: 33, sum of previous: 30
```

Alternatively, we can use monadic interpretation, e.g. into the State monad. For that, we do not have to
write our own recursion, but simply translate each instruction into a new monadic action. These will then 
automatically be chained, and the resulting monadic action can be handled as needed:

```{JavaScript}
function monadicInterpreter(program) {
  return program.interpretMonadic({
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
```

Note that here, we also have to provide a case for `Return`, providing the monad's constructor (it is assumed that
the binding method is called `chain`).

We can run this (assuming our State monad has a `run` method) with: 

```{JavaScript}
console.log(monadicInterpreter(testProgram()).run([]));
```

and it should produce a result equivalent to above.


## License ##

This package is licensed under the MIT license.