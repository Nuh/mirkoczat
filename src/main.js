global._ = require('lodash');
global.Debug = global.Debug || (() => _.noop);
global.utils = require('./lib/utils');
global.loader = global.context = global.ctx = new (require('./lib/Loader'))('./api');

const debug = Debug('CORE');

class Mirkoczat extends ctx('api.modularize.AbstractModularized') {
    constructor(config) {
        super('CORE', 'modules');

        this.db = require('./lib/services/db');
        this.queue = require('./lib/services/queue');
        this.config = config;

        this.loadModules(config.get('modules', ['all']));
    }

    bus(/*...*/) {
        if (arguments.length > 0) {
            this.queue.on.apply(queue, arguments);
        }
        return this.queue;
    }

    property(/*...*/) {
        let args = _.toArray(arguments);
        if (args.length > 0) {
            return this.config.get.apply(this.config, args)
        }
        return this.config
    }
}

module.exports = Mirkoczat;