class AbstractCoreModule {
    constructor(applicationInstance) {
        if (new.target === AbstractCoreModule) {
            throw new TypeError("Cannot construct AbstractCoreModule instances directly");
        }

        this.app = applicationInstance
    }
}

module.exports = AbstractCoreModule;