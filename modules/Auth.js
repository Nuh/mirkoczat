const MODULES_PATH = `${__dirname}/auths`;

class Auth extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('AUTH', MODULES_PATH)
        this.context = context;
        this.loadModules();
    }

    dependency() {
        return ['users'];
    }

//  eyJhcHBrZXkiOiJIeVc1SThnWldSIiwibG9naW4iOiJCb3NtYW5Qb2NpYWdvd3kiLCJ0b2tlbiI6IkxkNmJSRHdsOUhjRHQ4dncxQ1RaIiwic2lnbiI6IjBhOWU5MWJhZGUyNDM2MDE1YTdhMDgzYjVmOWFhMzhjIn0=

    async validate(channel, data) {
        try {
            let strategy = this.getStrategy(channel);
            let isValid = await strategy.validate(data);
            return !!isValid;
        } catch(msg) {
            this.debug('Failed validate via %s data: %o\nReason: %s', channel, data, msg);
            return false;
        }
    }

    async authorize(channel, data) {
        if (await this.validate(channel, data)) {
            try {
                let strategy = this.getStrategy(channel);
                let auth = this.context.getModule('users').register(await strategy.authorize(data));
                this.debug('Successful log in %o via %s', auth.username, channel)
                return auth;
            } catch(msg) {
                this.debug('Failed authorize via %s data: %o\nReason: %s', channel, data, msg);
                throw msg;
            }
        }
    }

}

module.exports = Auth;