const MODULES_PATH = `${__dirname}/interfaces`;
const debug = Debug('INTERFACE');

class Interface extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('INTERFACE', MODULES_PATH);
        this.context = context;
        this.loadModules();
    }

    dependency() {
        return ['auth', 'channels', 'users'];
    }

}

module.exports = Interface;