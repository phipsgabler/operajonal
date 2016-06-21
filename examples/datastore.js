'use strict';

const {Program, makeInstructions} = require('../');
const readline = require('readline');
const Task = require('data.task');

const DB = makeInstructions({
  GetThing: ['name'],
  PutThing: ['name', 'value'],
  Log: ['msg']
});


const testProgram = () => Program.do(function*() {
  let foo = yield DB.GetThing('foo');
  let bar = yield DB.GetThing('bar');
  yield DB.Log(`foo + bar is ${foo + bar}`);
  yield DB.PutThing('foo+bar', foo + bar);
  let foobar = yield DB.GetThing('foo+bar');
  return [foobar, foo + bar];
});

// the same thing in "verbose syntax":
//let testProgram = GetThing('foo').chain(
//    foo => GetThing('bar').chain(
//        bar => Log(`foo + bar: ${foo + bar}`).chain(
//            _ => PutThing('foo+bar', foo + bar))));


(function test1() {
  // simple version: we use a given "database" map, plus a mocked logger

  function interpret(program, database, logger) {
    function go(prog) {
      return Program.interpret(prog)({
        GetThing: (returning, name) => {
          const thing = database.get(name);
          return go(returning(thing));
        },
        PutThing: (returning, name, value) => {
          database.set(name, value);
          return go(returning({}));
        },
        Log: (returning, msg) => {
          logger.log(msg);
          return go(returning({}));
        }
      });
    }

    return go(program);
  }

  // set up 'environment':
  let testEnv = new Map();
  testEnv.set('foo', 10);
  testEnv.set('bar', 42);
  testEnv.set('baz', 666);

  const logger = new (class {
    constructor() {
      this.logs = []
    }

    log(msg) {
      this.logs.push(msg);
    }
  });

  // see if we get what we want:
  console.log('test 1 database at start: ', ...testEnv.entries());
  console.log('test 1 result: ', interpret(testProgram(), testEnv, logger));
  console.log('test 1 database at end: ', ...testEnv.entries());
  console.log('test 1 log: ', logger.logs);

  // expected result:
  // test 1 database at start:  [ 'foo', 10 ] [ 'bar', 42 ] [ 'baz', 666 ]
  // test 1 result:  [ 52, 52 ]
  // test 1 database at end:  [ 'foo', 10 ] [ 'bar', 42 ] [ 'baz', 666 ] [ 'foo+bar', 52 ]
  // test 1 log:  [ 'foo + bar is 52' ]
})();

(function test2() {
  // "complicated" version: we convert instructions into Tasks, which are chained into
  // a sequence of calls to `readline.question` (note the use of `interpretMonadic`!)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // because this is asynchronous, we can't get out of the read loop otherwise...
  rl.on('close', () => process.stdin.destroy());

  function interpret(program) {
    return Program.interpretMonadic(program)({
      Return: Task.of,
      GetThing: (name) => new Task((reject, resolve) => {
        rl.question(`Value for ${name}:\n> `, rawInput => {
          const input = Number(rawInput);
          if (Number.isNaN(input))
            reject(input);
          else
            resolve(input);
        });
      }),
      PutThing: (name, value) => new Task((reject, resolve) => {
        console.log(`Put: ${name} => ${value}`);
        resolve({});
      }),
      Log: (msg) => new Task((reject, resolve) => {
        console.log(`Log: ${msg}`);
        resolve({});
      })
    });
  }

  interpret(testProgram()).fork(
      error => {
        console.log('Error in test 2:', error);
        rl.close();
      },
      result => {
        console.log('Result of test 2:', result);
        rl.close();
      }
  );

  // example result:
  // Value for foo:
  // > 10
  // Value for bar:
  // > 20
  // Log: foo + bar is 30
  // Put: foo+bar => 30
  // Value for foo+bar:
  // > 30
  // Result of test 2: 30,30
})();

