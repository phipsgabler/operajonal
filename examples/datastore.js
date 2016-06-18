'use strict';

const {Program, makeInstructions} = require('../index.js');
const _ = require('underscore');

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
//let testProgram = GetThing('foo').flatMap(
//    foo => GetThing('bar').flatMap(
//        bar => Log(`foo + bar: ${foo + bar}`).flatMap(
//            _ => PutThing('foo+bar', foo + bar))));
////console.log(testProgram);
//


(function test1() {
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
  console.log('test 1 result: ', interpret(testProgram(), testEnv, logger));
  console.log('test 1 database: ', ...testEnv.entries());
  console.log('test 1 log: ', logger.logs);

  // expected result:
  //test 1 result:  [ 52, 52 ]
  //test 1 database:  [ 'foo', 10 ] [ 'bar', 42 ] [ 'baz', 666 ] [ 'foo+bar', 52 ]
  //test 1 log:  [ 'foo + bar is 52' ]
})();


