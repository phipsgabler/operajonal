'use strict';

const daggy = require('daggy');

// see: http://hackage.haskell.org/package/operational-0.2.3.2/docs/Control-Monad-Operational.html

// Basic representation of free programs
const Program = daggy.taggedSum({
  Lift: ['value'],
  Bind: ['action', 'continuation'],
  Instr: ['instruction']
});

const {Lift, Bind, Instr} = Program;

Program.of = x => Lift(x);

Program.prototype.chain = f => Bind(this, f);

Program.prototype.map = f => Bind(this, x => Program.of(f(x)));

Program.prototype.andThen = k => Bind(this, _ => k);

Program.prototype.view = () => this.cata({
  Lift: value => Return(x),
  Bind: (action, continuation) => action.cata({
    Lift: value => continuation(value).view,
    Bind: (action2, continuation2) =>
      Bind(action2, x => Bind(continuation2(x), continuation)).view,
    Instr: instruction => Continue(instruction, continuation)
  }),
  Instr: instruction => Continue(instruction, Program.of)
});

// for (let constr in Program) {
//   Object.assign(constr, {
//     get view() {
//       return constr.cata({
//         Lift: value => Return(x),
//         Bind: (action, continuation) => action.cata({
//           Lift: value => continuation(value).view,
//           Bind: (action2, continuation2) =>
//             Bind(action2, x => Bind(continuation2(x), continuation)).view,
//           Instr: instruction => Continue(instruction, continuation)
//         }),
//         Instr: instruction => Continue(instruction, Program.of)
//       });
//     }
//   });
// }

// Object.defineProperty(Program.prototype, 'view', {
//   get: () => this.cata({
//     Lift: value => Return(x),
//     Bind: (action, continuation) => action.cata({
//       Lift: value => continuation(value).view,
//       Bind: (action2, continuation2) =>
//         Bind(action2, x => Bind(continuation2(x), continuation)).view,
//       Instr: instruction => Continue(instruction, continuation)
//     }),
//     Instr: instruction => Continue(instruction, Program.of)
//   })
// });

// Object.assign(Program.prototype, {
//   get view() {
//     return this.cata({
//       Lift: value => Return(x),
//       Bind: (action, continuation) => action.cata({
//         Lift: value => continuation(value).view,
//         Bind: (action2, continuation2) =>
//           Bind(action2, x => Bind(continuation2(x), continuation)).view,
//         Instr: instruction => Continue(instruction, continuation)
//       }),
//       Instr: instruction => Continue(instruction, Program.of)
//     });
//   }
// }


// Views of programs, used to interpret them
const ProgramView = daggy.taggedSum({
  Return: ['value'],
  Continue: ['instruction', 'continuation']
});

const {Return, Continue} = ProgramView;


// see: https://github.com/Risto-Stevcev/do-notation
function programDo(generatorFunction) {
    const generator = generatorFunction();
    
    return function next(error, v) {
        const res = generator.next(v);
        
        if (res.done) {
            return Program.of(res.value);
        } else {
            return res.value.chain(v => next(null, v) || Program.of(v));
        }
    }()
}

// exports.instructionSet = function(name, value) {
//     return new Instr(Object.assign({type: name}, value));
// }

module.exports = {
  Program,
  ProgramView,
  programDo
};



