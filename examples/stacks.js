'use strict';

const op = require('../index.js');

const Push = n => op.Instruction('Push', {value: n});
const Pop = op.Instruction('Pop');
const Add = op.Instruction('Add');



const testProgram1 = op.program(function*() {
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


// const stackInterpreter = stack =>
//       new Interpreter().on('Push', (p, v, recur) => {
          
//       });

function interpretStackProgram(program, initialStack) {
    const view = program.view;

    switch (view.type) {
    case 'Return':
        return view.value;
    case 'Continue':
        switch (view.instr.type) {
        case 'Push': {
            return interpretStackProgram(view.cont({}), [view.instr.value, ...initialStack]);
        }
        case 'Pop': {
            const [first, ...rest] = initialStack;
            return interpretStackProgram(view.cont(first), rest);
        }
        case 'Add': {
            const [first, second, ...rest] = initialStack;
            const sum = first + second;
            return interpretStackProgram(view.cont(sum), [sum, ...rest]);
        }
        default:
            throw new Error(`Invalid view: ${JSON.stringify(view)}`);
        }
    default:
        throw 'Error';
    }
}


console.log(interpretStackProgram(testProgram1, []));

