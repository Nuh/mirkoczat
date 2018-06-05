const MODULES_PATH = `${__dirname}/auth`;
const debug = Debug('AUTH');

global.AbstractAuthModule = require('../api/model/AbstractAuthModule');

class Auth extends AbstractModularized {

    constructor(applicationInstance) {
        super('AUTH', MODULES_PATH)

        this.app = applicationInstance;
        this.loadModules();
    }

    run() {
        super.run();
        debug('Available strategies: %o', this.getStrategies());

        this.authorize('wykop', 'eyJhcHBrZXkiOiJIeVc1SThnWldSIiwibG9naW4iOiJCb3NtYW5Qb2NpYWdvd3kiLCJ0b2tlbiI6IkxkNmJSRHdsOUhjRHQ4dncxQ1RaIiwic2lnbiI6IjBhOWU5MWJhZGUyNDM2MDE1YTdhMDgzYjVmOWFhMzhjIn0=').then(console.log)
    }

    getStrategies() {
        return this.getModulesNames();
    }

    async validate(strategy, token) {
        try {
            let isValid = await this.getModule(strategy).validate(token);
            return !!isValid;
        } catch(msg) {
            debug('Failed validate %s token: %o\nReason: %s', strategy, token, msg);
            return false;
        }
    }

    async authorize(strategy, token) {
        try {
            return await this.getModule(strategy).authorize(token)
        } catch(msg) {
            debug('Failed authorize %s token: %o\nReason: %s', strategy, token, msg);
            throw msg;
        }
    }

}

module.exports = Auth;