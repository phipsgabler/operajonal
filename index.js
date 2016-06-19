'use strict';

const daggy = require('daggy');
const _ = require('underscore');

// see: http://hackage.haskell.org/package/operational-0.2.3.2/docs/Control-Monad-Operational.html

// Views of programs, used to interpret them
const ProgramView = daggy.taggedSum({
  Return: ['value'],
  Continue: ['instruction', 'continuation']
});

const {Return, Continue} = ProgramView;


// Internal representation of free programs over instructions
const Program = daggy.taggedSum({
  Lift: ['value'],
  Bind: ['action', 'continuation'],
  Instr: ['instruction']
});

const {Lift, Bind, Instr} = Program;

Program.of = x => Lift(x);

Program.emit = x => Instr(x);

Program.prototype.chain = function(f) {
  return Bind(this, f);
};

Program.prototype.map = function(f){
  return Bind(this, x => Program.of(f(x)));
};

Program.prototype.andThen = function(k) {
  Bind(this, _ => k);
};



function viewProgram(program) {
  return program.cata({
    Lift: value => Return(value),
    Bind: (action, continuation) => action.cata({
      Lift: value => viewProgram(continuation(value)),
      Bind: (action2, continuation2) =>
          viewProgram(Bind(action2, x => Bind(continuation2(x), continuation))),
      Instr: instruction => Continue(instruction, continuation)
    }),
    Instr: instruction => Continue(instruction, Program.of)
  })
}

Program.interpret = prog => interpretation => {
  const returner = interpretation.Return || (x => x);

  return viewProgram(prog).cata({
    Return: x => returner(x),
    Continue: (instruction, continuation) =>
        instruction.cata(_.mapObject(interpretation, e => _.partial(e, continuation, _)))
  });
};

Program.interpretMonadic = prog => transformation => {
  return viewProgram(prog).cata({
    Return: x => transformation.Return(x),
    Continue: (instruction, continuation) =>
        instruction.cata(transformation).chain(x => Program.interpretMonadic(continuation(x))(transformation))
  });
};

// see: https://github.com/Risto-Stevcev/do-notation
Program.do = function (generatorFunction) {
  const generator = generatorFunction();

  return function next(error, v) {
    const res = generator.next(v);

    if (res.done) {
      return Program.of(res.value);
    } else {
      return res.value.chain(v => next(null, v) || Program.of(v));
    }
  }()
};



function makeInstructions(constructors) {
  //return new Instr(Object.assign({type: name}, value));

  function instructions() {
    throw new TypeError('Instruction was called instead of one of its properties.');
  }

  const representation = daggy.taggedSum(constructors);

  for (let key in constructors) {
    if (!constructors[key].length)
        instructions[key] = Instr(representation[key]);
    else
        instructions[key] = (...args) => Instr(representation[key](...args));
  }

  return instructions;
}

module.exports = {
  Program,
  makeInstructions
};



