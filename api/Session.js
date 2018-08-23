const requestIp = require('request-ip');
const requestInfo = require('request-info');
const geoIp = require('geoip-lite');

class Session extends ctx('api.Observable') {
    constructor(ws, req, user) {
        if (!ws || !req || !user) {
            throw new TypeError("Nulled required arguments");
        }

        super();

        this.user = user;
        this.request = req;
        this.websocket = ws;
        this.channels = new Set();
        this.created = new Date();
        this.lastActivity = new Date();

        this.validate();

        utils.proxy.eventWith(ws, this, 'message', (...args) => _.flattenDeep([this, _.once((msg) => this.send(msg)), ...args]));
        utils.proxy.eventWith(ws, this, 'close', (...args) => _.flattenDeep([this, ...args]));
        utils.proxy.eventWith(ws, this, 'error', (...args) => _.flattenDeep([this, ...args]));

        this.debug = Debug(`USER:${user.type.toUpperCase()}:${utils.extract.username(user)}:SESSION:${this.created.getTime()}`);
        this.debug('Created a new session (IP: %s)', this.getClientInfo().prettyIp);
    }

    validate() {
        if (!this.websocket || !this.request || !this.user instanceof ctx('api.users.AbstractUser')) {
            throw "Invalid session"
        }
    }

    isOnline() {
        return this.websocket && this.websocket.readyState === 1;
    }

    getClientInfo() {
        if (!this._clientInfo) {
            let ip = requestIp.getClientIp(this.request);
            this._clientInfo = _.extend(_.cloneDeep(requestInfo(this.request)), {
                ip: ip,
                prettyIp: geoIp.pretty(ip),
                location: geoIp.lookup(ip)
            });
        }
        return this._clientInfo;
    }

    join(channel) {
        if (channel && channel instanceof ctx('api.channels.AbstractChannel')) {
            if (!this.channels.has(channel)) {
                if (channel.join(this)) {
                    this.channels.add(channel);
                    this.debug('Join %o channel', channel.name);
                } else {
                    this.debug('Try to join %o channel but cannot', channel.name);
                }
            }
            return this.channels.has(channel);
        }
    }

    leave(channel, reason) {
        if (channel && (typeof channel === 'string' || channel instanceof String)) {
            channel = _.find([...this.channels], (ch) => ch && ch.name === channel);
        }
        if (channel && channel instanceof ctx('api.channels.AbstractChannel') && this.channels.has(channel)) {
            this.debug('Leave %o channel because: %s', channel.name, reason || 'no reason');
            this.channels.delete(channel);
            return channel.left(this, reason);
        }
    }

    send(message) {
        if (message) {
            message = utils.convert.toResponse(message);
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            try {
                return proxy(this.websocket)('send', message) || true;
            } catch (e) {
                if (!this.isOnline()) {
                    this.terminate();
                    this.emit('close');
                } else {
                    this.debug('Catched error when sending a message: %s\n', message, e);
                }
            }
        }
        return false;
    }

    close(code, reason) {
        try {
            setTimeout(() => this.terminate(), 10 * 1000);
            return proxy(this.websocket)('close', ...arguments);
        } catch (e) {
            return this.terminate();
        }
    }

    terminate() {
        try {
            return proxy(this.websocket)('terminate', ...arguments) || true;
        } catch (e) {
            return false;
        }
    }

    toResponse() {
        return utils.convert.toResponse(this.user);
    }
}

let proxy = (ws) => (funcName, ...args) => ((ws || {})[funcName] || _.noop).bind(ws)(...args);

module.exports = Session;