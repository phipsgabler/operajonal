'use strict';

const op = require('../index.js');

const Push = n => op.Instruction('Push', {value: n});
const Pop = op.Instruction('Pop');
const Add = op.Instruction('Add');

const stackInterpreter = stack =>
      new Interpreter().on('Push', (p, v, recur) => {
          
      });

function interpret2(program, stack) {
    let view = program.view;

    switch (view.type) {
    case 'Return':
        return view.value;
    case 'Continue':
        switch (view.instr.type) {
        case 'Push':
            return interpret2(view.cont({}), [view.instr.value].concat(stack));
        case 'Pop':
            return interpret2(view.cont(stack[0]), stack.slice(1));
        case 'Add':
            let result = stack[0] + stack[1];
            return interpret2(view.cont(result), [result].concat(stack.slice(2)));
        default:
            throw new Error(`Invalid view: ${JSON.stringify(view)}`);
        }
    default:
        throw 'Error';
    }
}

const testProgram1 = op.Do(function*() {
    yield Push(10);
    yield Push(20);
    yield Add;
    yield Push(33);
    let thirtyTwo = yield Pop;
    let sum = yield Pop;
    return [sum, thirtyTwo];
});

// console.log(testProgram1.view);
// console.log(testProgram1.view.cont({}).view);
// console.log(testProgram1.view.cont({}).view.cont({}).view);
// console.log(testProgram1.view.cont({}).view.cont({}).view.cont({}).view);

console.log(interpret2(testProgram1, []));

// let testProgram2 = Push(10).andThen(Push(20))
//     .andThen(Add())
//     .andThen(Push(33))
//     .andThen(Pop()).flatMap(
//         thirtyTwo => Pop().flatMap(
//             sum => Program.inject([sum, thirtyTwo])));
