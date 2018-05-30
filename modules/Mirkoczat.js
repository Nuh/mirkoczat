const debug = Debug('MIRKOCZAT');
const Channel = require('../api/Channel');

let normalizeToken = function(token) {
    try {
        let json = Buffer.from(token, 'base64').toString();
        return _.extend(JSON.parse(json), {token: token});
    } catch (e) {
        debug('Wrong token %o, error: %s', token, e.message);
        process.exit(1);
    }
};

let registerChannelEvents = function(name, queue) {
    queue.on(`channel::${name}::send`, (message) => this.sendMessage.call(this, message, name, false));
    queue.on(`channel::${name}::send::priority`, (message) => this.sendMessage.call(this, message, name, true));
    queue.on(`channel::${name}::execute`, (command, ...args) => this.execute.call(this, command, args, name));
};
let unregisterChannelEvents = function(name, queue) {
    [`channel::${name}::send`, `channel::${name}::send::priority`, `channel::${name}::execute`]
        .forEach((eventName) => queue.removeAllListeners(eventName))
};

class Mirkoczat {
    constructor(applicationInstance) {
        // CONFIG
        let token = normalizeToken(applicationInstance.property('token'));
        let highlight = applicationInstance.property('highlight') || token.login;

        this.token = token
        this.highlightMatcher = highlight ? new RegExp(highlight, 'gi') : null

        // INSTANCEs
        this.app = applicationInstance;

        // DATA
        this.channels = {};
    }

    prepare() {
        this.app.config.require('server', 'token');
    }

    run() {
        this.app.bus('mirkoczat::send', (message) => this.sendMessage.call(this, message, null, false));
        this.app.bus('mirkoczat::send::priority', (message) => this.sendMessage.call(this, message, null, true));
        this.app.bus('mirkoczat::execute', (command, ...args) => this.execute.call(this, command, args, null));

        if (!this.reconnectorInterval) {
            this.reconnectorInterval = setInterval(() => {
                _(this.channels)
                    .filter((c) => c.instance.connected === false)
                    .values()
                    .value()
                    .forEach((c) => _.delay(() => this.channelRejoin(c.name, c.login), 0))
            }, 6000)
        }

        let names = this.app.property('channels', ['hydepark']);
        for (let i in names) {
            this.channelJoin(names[i], this.token);
        }
    }

    getUsername() {
        return this.token && this.token.login ? this.token.login : null;
    }

    hasChannel(name) {
        return name && name in this.channels;
    }

    getChannel(name) {
        return this.hasChannel(name) ? this.channels[name] : null
    }

    getChannelInstance(name) {
        return this.hasChannel(name) ? this.channels[name].instance : null
    }

    channelRejoin(name) {
        if (name) {
            this.channelLeave(name, true);
            this.channelJoin(name);
        }
        return this
    }

    channelJoin(name) {
        let login = this.getUsername() || 'unknown';
        if (name && !this.hasChannel(name)) {
            let channel = new Channel(this.app.queue, this.app.property('server'), name, this.token, this.highlightMatcher);
            channel.connect((queue) => {
                registerChannelEvents.call(this, name, queue);
                console.log(`Connected '${login}' to #${name} channel`)
            });
            this.channels[name] = { name: name, login: login, instance: channel }
        }
        return this.channels[name]
    }

    channelLeave(name, force = false) {
        if (!force && _(this.channels).filter((c) => c.instance.connected).values().size() <= 1) {
            return;
        }

        let ch = this.channels[name];
        if (ch) {
            if (ch.instance) {
                ch.instance.disconnect();

                let login = this.getUsername() || 'unknown';
                if (!ch.instance.wasConnected) {
                    console.log(`Cannot connected '${login}' to #${name} channel`)
                } else {
                    console.log(`Disconnected '${login}' from #${name} channel`)
                }
            }

            unregisterChannelEvents(name, this.app.queue);
            delete this.channels[name];
            return true;
        }
    }

    sendMessage(message, channelName = null, prioritized = false) {
        let sendMessage = function(channel, message, prioritized) {
            if (channel && channel.instance instanceof Channel && message) {
                return channel.instance.sendMessage(message, prioritized);
            }
        };

        if(_.isNil(channelName)) {
            let values = {};
            for (let i in this.channels) {
                values[i] = sendMessage(this.channels[i], message, prioritized);
            }
            return values;
        } else if (this.hasChannel(channelName)) {
            return sendMessage(this.channels[channelName], message, prioritized);
        }
    }

    execute(command, args, channelName = null) {
        let execute = function (channel, command, args) {
            let ch = channel && channel.instance ? channel.instance : channel
            if (command && ch instanceof Channel) {
                var method = ch[`do${_.upperFirst(_.camelCase(command))}`] || ch[_.camelCase(command)] || ch[command];
                if (method && method instanceof Function) {
                    debug('Execute %o on %o with arguments: %o', command, channel.name, args);
                    return method.apply(ch, _.flattenDeep(_.toArray(args)));
                }
            }
        };

        if(_.isNil(channelName)) {
            let values = {};
            for (let i in this.channels) {
                values[i] = execute(this.channels[i], command, args);
            }
            return values;
        } else if (this.hasChannel(channelName)) {
            return execute(this.channels[channelName], command, args);
        }
    }
}

module.exports = Mirkoczat;