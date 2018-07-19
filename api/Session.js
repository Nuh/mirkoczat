const requestIp = require('request-ip');
const requestInfo = require('request-info');
const geoIp = require('geoip-lite');
const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Session extends EventEmitter2 {
    constructor(ws, req, user) {
        if (!ws || !req || !user) {
            throw new TypeError("Nulled required arguments");
        }

        super();

        this.websocket = ws;
        this.request = req;
        this.user = user;

        utils.proxy.event(ws, this, 'message', 'close');

        this.lastActivity = new Date();
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
}

let proxy = (ws) => (funcName, ...args) => ((ws || {})[funcName] || _.noop).bind(ws)(...args);

module.exports = Session;