const MODULES_PATH = `${__dirname}/auth`;

class Auth extends ctx('api.modularize.AbstractStrategized') {

    constructor(applicationInstance) {
        super('AUTH', MODULES_PATH)
        this.app = applicationInstance;
        this.loadModules();
    }

    run() {
        super.run();
//        this.authorize({}, 'wykop', 'eyJhcHBrZXkiOiJIeVc1SThnWldSIiwibG9naW4iOiJCb3NtYW5Qb2NpYWdvd3kiLCJ0b2tlbiI6IkxkNmJSRHdsOUhjRHQ4dncxQ1RaIiwic2lnbiI6IjBhOWU5MWJhZGUyNDM2MDE1YTdhMDgzYjVmOWFhMzhjIn0=').then(console.log)
    }

    async validate(channel, token) {
        try {
            let strategy = this.getStrategy(channel);
            let isValid = await strategy.validate(token);
            return !!isValid;
        } catch(msg) {
            this.debug('Failed validate token %o via %s.\nReason: %s', token, channel, msg);
            return false;
        }
    }

    async authorize(socket, channel, token) {
        try {
            let strategy = this.getStrategy(channel);
            let auth = await strategy.authorize(socket, token)
            this.debug('Successful log in %o via %s', auth.login, channel)
            return auth;
        } catch(msg) {
            this.debug('Failed authorize token %o via %s.\nReason: %s', token, channel, msg);
            throw msg;
        }
    }

}

module.exports = Auth;