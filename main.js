global._ = require('lodash');
global.Debug = _.noop() || global.Debug;
global.AbstractModularized = require('./api/model/AbstractModularized');
global.AbstractCoreModule = require('./api/model/AbstractCoreModule');

const MODULES_PATH = 'modules';

const debug = Debug('CORE');
const db = require('./api/db');
const queue = require('./api/queue');

class Mirkoczat extends AbstractModularized {
    constructor(config) {
        super('CORE', MODULES_PATH);

        this.db = db
        this.queue = queue
        this.config = config

        let wantedModules = _(config.get('modules', ['all'])).castArray().flattenDeep().map(_.toLower).value();
        this.loadModules(wantedModules);
    }

    bus(/*...*/) {
        if (arguments.length > 0) {
            queue.on.apply(queue, arguments)
        }
        return queue
    }

    property(/*...*/) {
        let args = _.toArray(arguments)
        if (args.length > 0) {
            return this.config.get.apply(this.config, args)
        }
        return this.config
    }
}

module.exports = Mirkoczat