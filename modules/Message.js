const MODULES_PATH = `${__dirname}/messages`;

class Message extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('MESSAGE', MODULES_PATH);
        this.context = context;
        this.loadModules();
    }

    dependency() {
        return ['auth', 'channels', 'users'];
    }

    parse(raw, user) {
        try {
            let data = JSON.parse(raw);
            if (data && data instanceof Object && data.type) {
                return new (ctx('api.messages.Request'))(raw, user);
            }
        } catch (e) {
            this.debug('Catch exception while parsing message: %o\n%O', raw, e);
            throw "Bad syntax of message";
        }
    }

    async handle(raw, user) {
        let req = raw;
        let result = true;
        let response = null;

        try {
            req = this.parse(raw, user);
            if (req && req instanceof ctx('api.messages.Request')) {
                let strategy = this.getStrategy(req.type);
                if (strategy) {
                    response = strategy.handle(req);
                } else {
                    throw "Not supported type of message";
                }
            }
        } catch(e) {
            response = e;
            result = false;
        }

        return new (ctx('api.messages.Response'))(req, result, response);
    }

}

module.exports = Message;