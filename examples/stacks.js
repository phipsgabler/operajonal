'use strict';

const {Program, makeInstructions} = require('../index.js');
const daggy = require('daggy');

//const Push = n => op.Program.emit({type: 'Push', value: n});
//const Pop = op.Program.emit({type: 'Pop'});
//const Add = op.Program.emit({type: 'Add'});

const StackInstr = makeInstructions({
  Push: ['value'],
  Pop: [],
  Add: []
});

const {Push, Pop, Add} = StackInstr;

//const StackInstr = daggy.taggedSum({
//  Push: ['value'],
//  Pop: [],
//  Add: []
//});
//
//const Push = n => op.Program.emit(StackInstr.Push(n));
//const Pop = op.Program.emit(StackInstr.Pop);
//const Add = op.Program.emit(StackInstr.Add);


const testProgram1 = Program.do(function*() {
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

//
//
console.log(interpreter(testProgram1, []));

