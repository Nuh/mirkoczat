const MODULES_PATH = `${__dirname}/interfaces`;
const ENABLED_STRATEGIES_KEY_PROPERTY = 'interfaces:strategies';

class Interface extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('INTERFACE', MODULES_PATH);
        this.context = context;
        this.loadModules(this.context.property(ENABLED_STRATEGIES_KEY_PROPERTY, ['all']));
    }

    dependency() {
        return ['auth', 'channels', 'users', 'message'];
    }

}

module.exports = Interface;