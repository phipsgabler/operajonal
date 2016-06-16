'use strict';

// see: http://hackage.haskell.org/package/operational-0.2.3.2/docs/Control-Monad-Operational.html

// Basic representation of free programs
class Program {
    constructor(type) {
        this.type = type;
    }

    static inject(x) {
        return new Lift(x);
    }

    flatMap(f) {
        return new Bind(this, f);
    }
    
    map(f) {
        return new Bind(this, x => Program.inject(f(x)));
    }
    
    andThen(k) {
        return new Bind(this, _ => k);
    }

    get view() {
        switch(this.type) {
        case 'Lift':
            return new Return(this.value);
        case 'Bind':
            switch(this.m.type) {
            case 'Lift':
                return this.f(this.m).view;
            case 'Bind':
                return (new Bind(this.m.m, x => new Bind(this.m.f(x), this.f))).view;
            case 'Instr':
                return new Continue(this.m.instr, this.f);
            default:
                throw new Error(`Object ${JSON.stringify(this.m)} is not a valid Program!`);
            }
        case 'Instr':
            return new Continue(this.instr, Program.inject);
        default:
            throw new Error(`Object ${this} is not a valid Program!`);
        }
    }

    // interpret(interpreter) {
    //     const view = this.view;
        
    //     switch (view.type) {
    //     case 'Return':
    //         return view.value;
    //     case 'Continue':
    //         if (!interpreter.has(view.instr.type)){
    //             throw new Error(`Instruction ${view.instr} is not handled!`);
    //         }

    //         interpreter.handlers.get(view.instr.type)(view.instr, view.cont);
    //     default:
    //         throw 'Error';
    //     }
    // }
}

class Lift extends Program {
    constructor(value) {
        super('Lift');
        this.value = value;
    }
}

class Bind extends Program {
    constructor(m, f) {
        super('Bind');
        this.m = m;
        this.f = f;
    }
}

class Instr extends Program {
    constructor(instr) {
        super('Instr');
        this.instr = instr;
    }
}


// Interpreter DSL for Programs
class Interpreter {
    constructor() {
        this.handlers = new Map();
    }
    
    on(type, handler) {
        this.handlers.set(type, handler);
    }
}



// Views of programs, used to interpret them
class ProgramView {
    constructor(type) {
        this.type = type;
    }
}

class Return extends ProgramView {
    constructor(value) {
        super('Return');
        this.value = value;
    }
}

class Continue extends ProgramView {
    constructor(instr, cont) {
        super('Continue');
        this.instr = instr;
        this.cont = cont;
    }
}

// see: https://github.com/Risto-Stevcev/do-notation
exports.Do = function(generatorFunction) {
    const generator = generatorFunction();
    
    return function next(error, v) {
        const res = generator.next(v);
        
        if (res.done) {
            return Program.inject(res.value);
        } else {
            return res.value.flatMap(v => next(null, v) || Program.inject(v));
        }
    }()
}

exports.Instruction = function(name, value) {
    return new Instr(Object.assign({type: name}, value));
}

exports.Program = Program;



