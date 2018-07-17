class AbstractStrategized extends ctx('api.modularize.AbstractModularized') {
    constructor(name, ...paths) {
        if (new.target === AbstractStrategized) {
            throw new TypeError("Cannot construct AbstractStrategized instances directly");
        }

        super(name, ...paths);
        this.name = name;
    }

    run() {
        super.run();
        this.debug('Available strategies: %o', this.getStrategies());
    }

    getStrategy(name) {
        let strategy = this.getModule(name) || this.getModule(`${name}${this.name.toLowerCase()}`);
        if (!strategy) {
            throw `Unknown strategy ${name}`
        }
        return strategy;
    }

    getStrategies() {
        return _.map(this.getModulesNames(), (name) => name.replace(new RegExp(`${this.name.toLowerCase()}$`), ''));
    }
}

module.exports = AbstractStrategized;