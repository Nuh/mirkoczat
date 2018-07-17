const MODULES_PATH = `${__dirname}/interface`;
const debug = Debug('INTERFACE');

class Interface extends ctx('api.modularize.AbstractStrategized') {

    constructor(applicationInstance) {
        super('INTERFACE', MODULES_PATH)
        this.app = applicationInstance;
        this.loadModules();
    }

    dependency() {
        return ['auth'];
    }

}

module.exports = Interface;