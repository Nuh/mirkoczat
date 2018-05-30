const debug = Debug('CHATBOT');
const Promise = require('bluebird');
const Cleverbot = require("cleverbot.io");

let eventHandler = function (msg, data) {
    if (data.myMessage) {
        return;
    }

    let fixedMsg = msg.toString().replace(/(^|\s)@/, ' ').trim()
    let chance = this.app.property('chatbot:highlightChance', 0.1);
    if (!data.command && (data.direct || (data.highlight && Math.random() < chance))) {
        this.ask(fixedMsg, data);
    }
}

let sendMessage = function (msg, channel) {
    let queue = channel ? `channel::${channel}::send` : 'mirkoczat::send';
    this.app.queue.emit(queue, msg);
};

let reply = function (msg, data) {
    if (!data || !msg || !msg.toString().trim()) {
        return;
    }

    let nick = data.user;
    let channel = data.channel;
    if (channel && nick) {
        let cmd = data.private ? `/msg ${nick || 'SYSTEM'} ` : ''
        let prefix = !data.private ? `@${nick}: ` : ''

        debug('Reply to %s: %o', nick, msg);
        sendMessage.call(this, `${cmd}${prefix}${msg}`, channel)
    }
};

let createModel = function(msg, data) {
    if (msg.trim() && data) {
        return {
            msg: msg,
            data: data,
            date: new Date()
        };
    }
}

class Chatbot {
    constructor(applicationInstance) {
        this.app = applicationInstance;

        this.bot = null;
        this.asks = [];

        this.cleanupOlderThan = this.app.property('chatbot:cleanup:olderThan', 600); // s
        this.cleanupTime = this.app.property('chatbot:cleanup:time', 30); // s
        this.askTime = this.app.property('chatbot:askTime', 750); // ms
    }

    dependency() {
        return ['mirkoczat']
    }

    run() {
        this.app.bus('channel::*::query', eventHandler.bind(this))
        this.app.bus('channel::*::message', eventHandler.bind(this))
        if (!this.askInterval) {
            this.askInterval = setInterval(() => {
                var ask = this.asks.pop();
                if (ask) {
                    this.response.bind(this)(ask.msg, ask.data)
                        .then((response) => reply.call(this, response.msg, response.data))
                        .catch((e) => debug('Failed response on ask: %o', e));
                }
            }, this.askTime);
        }
        if (!this.cleanupInterval && this.cleanupTime) {
            this.cleanupInterval = setInterval(this.cleanup.bind(this), 1000 * this.cleanupTime);
        }
    }

    stop() {
        if (this.askInterval) {
            this.asks.length = 0;
            clearInterval(this.askInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.app.bus().offAny(eventHandler);
        this.removeSession();
    }

    createSession() {
        return new Promise((resolve, reject) => {
            if (this.bot) {
                return resolve(this.bot);
            }

            let user = this.app.property('chatbot:account:user')
            let apiKey = this.app.property('chatbot:account:key');

            if (!user || !user.trim() || !apiKey || !apiKey.trim()) {
                return reject('No provided keys to create session of CleverBot.io')
            }

            let bot = new Cleverbot(user, apiKey);
            bot.setNick(this.app.getModule('mirkoczat').getUsername() || 'mirkobot');
            bot.create((err, session) => {
                if (err) {
                    return reject(err);
                }

                resolve((this.bot = bot));
            });
        });
    }

    removeSession() {
        if (this.bot) {
            this.bot = null;
        }
        return this;
    }

    cleanup() {
        if (this.cleanupOlderThan) {
            this.asks = _(this.asks)
                            .filter((ask) => {
                                let diff = ask.date ? (new Date()).getTime() - ask.date.getTime() : -1;
                                if (diff < 0) {
                                    ask.date = new Date();
                                }
                                return diff > 1000 * this.cleanupOlderThan;
                             })
                            .compact()
                            .value();
        }
        return this;
    }

    ask(msg, data) {
        this.asks = this.asks || [];

        let ask = createModel(msg, data)
        if (ask && !_.find(this.asks, (e) => e && _([e.msg, ask.msg]).map(_.trim).map(_.toLower).map(_.ary(_.words, 1)).map(_.ary(_.join, 1)).uniq().size() <= 1)) {
            this.asks.unshift(ask);
            debug('Asked %o by %s', ask.msg, ask.data.user);
        }
        return this;
    }

    response(msg, data) {
        if (!msg || !msg.trim() || !data) {
            return Promise.reject('No message to response');
        }

        return this.createSession().then((bot) => {
            return new Promise(function (resolve, reject) {
                bot.ask(msg, (err, response) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(createModel(response, data));
                });
            });
        });
    }

}

module.exports = Chatbot;