import Debug from 'debug';
import nconf from 'nconf';
import yargs from 'yargs';
import Observable from '../lib/Observable';

export default class Config extends Observable {
    constructor(file = 'mikroczat.config') {
        super();

        this._debug = Debug('CONFIG');
        this._config = nconf
            .defaults({config: file})
            .argv(yargs
                .version(process.env.npm_package_version || require('../../package.json').version)
                .usage('MikroCzat - simply server to chat')
                .strict()
                .options({
                    "c": {
                        alias: 'config',
                        describe: 'Configuration file',
                        type: 'string',
                        requiresArg: true,
                        normalize: true
                    }
                })
                .help()
            ).env({
                separator: '_',
                lowerCase: true,
                parseValues: true
            });

        let config = this._config.get('config');
        if (config && config instanceof String) {
            this._config.file(config);
        }

        handleExit();
    }

    load(data) {
        if (data && data instanceof Object) {
            this._config.add('literal', {store: data || {}});
        }
        return this;
    }

    require(...args) {
        try {
            nconf.required(args)
        } catch (e) {
            this._debug("Error required arguments: %O", e);
            console.error(`Error configuration! ${e.message}`);
            process.exit();
        }
        return this;
    }

    get(name, defaultValue = null) {
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
        nconf.save((err) => err && this._debug('Failed saving configuration: %s', err));
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
            this._debug('Saved configuration to file on exit');
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