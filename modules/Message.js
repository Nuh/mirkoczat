const MODULES_PATH = `${__dirname}/messages`;

class Message extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('MESSAGE', MODULES_PATH)
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
                let strategy = this.getStrategy(data.type);
                if (strategy && strategy.parse instanceof Function) {
                    return strategy.parse(data, user);
                }
                return new (ctx('api.Message'))(data.type, user, data.data);
            }
            throw "Unknown type of message or bad syntax";
        } catch (e) {
            this.debug('Catch exception %o while try parsing message %o', e, raw);
            throw e;
        }
    }

    async handle(msg) {
        if (msg && msg instanceof ctx('api.Message')) {
            let strategy = this.getStrategy(msg.type);
            if (strategy) {
                return strategy.handle(msg);
            }
        }
        throw "Unknown type of message or bad syntax";
    }

}

module.exports = Message;