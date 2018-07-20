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

    parse(raw, user, session) {
        try {
            let data = JSON.parse(raw);
            if (data && data instanceof Object && data.type) {
                return new (ctx('api.messages.Request'))(raw, user, session);
            }
        } catch (e) {
            this.debug('Catch exception while parsing message: %o\n%O', raw, e);
            throw "Bad syntax of message";
        }
    }

    async handle(raw, user, session) {
        let req = raw;
        let result = true;
        let response = null;

        try {
            req = this.parse(raw, user, session);
            if (req && req instanceof ctx('api.messages.Request')) {
                let strategy = this.getStrategy(req.type);
                if (strategy) {
                    try {
                        response = strategy.handle(req);
                    } catch (e) {
                        if (e instanceof TypeError) {
                            this.debug('Catch exception while executing message: %o\n%O', raw, e);
                            throw "Bad syntax of message";
                        }
                        throw e;
                    }
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