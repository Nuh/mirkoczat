const debug = Debug('CONFIG');
const nconf = require('nconf');

class Config {
    constructor(defaults = {}, file = 'mikroczat.config') {
        this.file = file;
        this.defaults = defaults;
        this.loaded = false;
    }

    require(/*...*/) {
        if (!this.loaded) {
            this.load();
        }

        try {
            nconf.required(_.flattenDeep(arguments))
        } catch (e) {
            debug(e.message);
            console.error(`Error configuration! ${e.message}`);
            process.exit();
        }
        return this
    }

    load() {
        nconf.argv(
                require('yargs')
                    .version('1.0.0')
                    .usage('MirkoCzat - simply server to chat')
                    .options({
                        "c": {
                            alias: 'config',
                            describe: 'Configuration file',
                            type: 'string',
                            requiresArg: true,
                            normalize: true,
                            default: this.file
                        }
                    })
                    .help())
             .env();

        nconf.file({ file: nconf.get('config') })
             .defaults(this.defaults || {});

        this.loaded = true;
        this.require('config');
        handleExit();
        return this;
    }

    get(name, defaultValue = null) {
        if (!this.loaded) {
            this.load();
        }

        var value = nconf.get(name);
        if (_.isNil(value)) {
            if (!_.isNil(defaultValue)) {
                this.set(name, defaultValue);
            }
            return defaultValue;
        }
        return value;
    }

    set(name, value) {
        if (_.isNil(value)) {
            nconf.remove(name);
        } else {
            nconf.set(name, value);
        }
        return this;
    }

    remove(name) {
        return this.set(name, null);
    }

    save() {
        nconf.save(function (err) {
            err && debug('Failed while saving configuration: %s', err);
        });
        return this;
    }
}

function handleExit() {
    let exitHandler = function (options, err = null, code = 0) {
        if (err && err.stack) {
            console.error(err.stack);
        }
        if (options.cleanup) {
            nconf.save();
            debug('Saved configuration to file on exit');
        }
        if (options.exit) {
            process.exit(code || err && err.stack ? 2 : 0);
        }
    };

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, {cleanup: true}));
    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {exit: true}));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
    process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
}

module.exports = Config;