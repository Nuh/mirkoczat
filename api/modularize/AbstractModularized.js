class AbstractModularized {
    constructor(name, ...paths) {
        if (new.target === AbstractModularized) {
            throw new TypeError("Cannot construct AbstractModularized instances directly");
        }

        this.loaded = false;
        this.debug = Debug(`${name || `unknown:${new Date()}`}`);
        this.options = {
            name: name,
            paths: paths
        };
        this.modules = {};
    }

    isPrepared() {
        return !_.some(this.massExecute('isPrepared'), (value) => value === false);
    }

    isInitialized() {
        return !_.some(this.massExecute('isInitialized'), (value) => value === false);
    }

    isReady() {
        if (!this.loaded) {
            while (_.some(this.massExecute('isReady'), (value) => value === false)) {
                this.debug('Waiting on modules readiness');
                sleep(1000);
            }
        }
        return true;
    }

    getModules() {
        return this.modules;
    }

    getModulesNames() {
        return _.keys(this.modules);
    }

    isLoadedModule(name) {
        return _.toLower(name) in this.modules;
    }

    getModule(name) {
        let module = this.getModuleDescription(name) || {};
        return !_.isNil(module.instance) ? module.instance : module.file
    }

    getModuleDescription(name) {
        if (this.isLoadedModule(name)) {
            return this.modules[_.toLower(name)]
        }
    }

    hasModule(module) {
        try {
            require.resolve(module.path);
            return true;
        } catch (e) {
            this.debug('No found module: %o', (module || {}).name || 'unknown');
        }
        return false;
    }

    initModule(obj) {
        if (!obj) {
            return;
        }
        if (obj.constructor instanceof Function || (obj.prototype && obj.prototype.constructor instanceof Function)) {
            return new obj(this);
        } else {
            return obj(this);
        }
        return obj;
    }

    loadModule(module) {
        if (this.hasModule(module)) {
            if (this.isLoadedModule(module.name)) {
                return this.getModuleDescription(module.name);
            }

            try {
                let path = module.path;
                let file = require(path);
                let loadedModule = _.defaults({instance: this.initModule(file), executed: [], file: file}, module);

                this.modules[_.toLower(loadedModule.name)] = loadedModule;

                this.debug('Loaded module: %o', loadedModule.name);
                return loadedModule;
            } catch (e) {
                this.debug('Failed load module: %o\n%O', (module || {}).name || 'unknown', e);
                throw e;
            }
        }
    }

    unloadModule(name) {
        try {
            if (this.isLoadedModule(name)) {
                let module = this.getModuleDescription(name);

                this.execute(moduleName, 'stop');
                this.execute(moduleName, 'destroy');
                delete this.modules[moduleName];

                this.debug('Unloaded module: %o', module.name);
                return true
            }
        } catch (e) {
            // ignore
        }
        return false
    }

    loadModules(...names) {
        let availableModules = this.availableModules();
        let wantedModules = _(names && names.length ? names : ['all']).flattenDeep().map(_.toLower).compact().value();
        let modules = _.includes(wantedModules, 'all') ? _.keys(availableModules) : wantedModules;

        // Loading modules
        for (let name of modules) {
            this.loadModule(availableModules[name])
        }

        // Debug info
        let diff = _.without.apply(_, [availableModules].concat(modules));
        if (_.size(diff)) {
            this.debug('Disabled modules: %o', diff)
        }
    }

    availableModules() {
        return _(this.options.paths)
            .map((path) => _.values(utils.modules.find(path)))
            .flattenDeep()
            .sort()
            .uniqBy('name')
            .keyBy('name')
            .mapKeys((value, name) => _.toLower(name))
            .value()
    }

    checkDependency() {
        for (let name in this.modules) {
            let deps = _(this.execute(name, 'dependency')).values().castArray().compact()
                .groupBy((v) => this.isLoadedModule.call(this, v)).value();
            if (!_.isEmpty(deps['false'])) {
                this.debug('Error! Dependency is not met for %o - required %o modules!', name, deps['false']);
                return false;
            }
        }
        return true;
    }

    execute(moduleName, methodName, ...args) {
        let instance = this.getModule(moduleName) || {};
        let method = instance[methodName];
        let module = this.getModuleDescription(moduleName);
        let value;

        if (method && method instanceof Function) {
            value = method.apply(instance, args);
            module.executed = module.executed || [];
            module.executed.push(methodName);
            this.debug('Executed method %o on %o', methodName, module.name);
        }
        return value;
    }

    massExecute(methodName, ...args) {
        let ret = {};
        for (let name in this.getModules()) {
            ret[name] = this.execute.apply(this, [name, methodName].concat(args));
        }
        return ret;
    }

    prepare() {
        this.massExecute('prepare');
        if (!this.isPrepared()) {
            return false;
        }

        if (!this.checkDependency()) {
            console.error('Required modules does not met required dependencies needed to run!');
            return false;
        }
    }

    init() {
        this.massExecute('init');
        if (!this.isInitialized()) {
            return false;
        }
    }

    run() {
        if (!this.loaded) {
            this.prepare();
            this.init();
            if (this.isReady()) {
                this.massExecute('run');
                this.loaded = true;
            }
        }
        return this.loaded;
    }

    stop() {
        if (this.loaded) {
            this.loaded = false;

            this.massExecute('stop');
            this.massExecute('destroy');
        }
        return !this.loaded;
    }
}

module.exports = AbstractModularized;