class AbstractStrategized extends ctx('api.modularize.AbstractModularized') {
    constructor(name, ...paths) {
        super(name, ...paths);

        if (new.target === AbstractStrategized) {
            throw new TypeError("Cannot construct AbstractStrategized instances directly");
        }

        this.name = name;
    }

    run() {
        super.run();
        this.debug('Available strategies: %o', this.getStrategies());
    }

    getStrategy(name) {
        let strategy = this.getModule(_.toLower(name)) || this.getModule(_.toLower(`${name}${this.name}`));
        if (!strategy) {
            throw `Unknown strategy ${name}`;
        }
        return strategy;
    }

    getStrategies() {
        return _.map(this.getModulesNames(), (name) => name.replace(new RegExp(`${_.toLower(this.name)}$`), ''));
    }
}

module.exports = AbstractStrategized;