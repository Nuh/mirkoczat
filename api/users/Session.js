const requestIp = require('request-ip');
const requestInfo = require('request-info');
const geoIp = require('geoip-lite');

let proxy = (ws) => { return (funcName, ...args) => ((ws || {})[funcName] || _.noop).bind(ws)(...args) }

class Session {
    constructor(ws, req, user) {
        this.websocket = ws;
        this.request = req;
        this.user = user;

        this.lastActivity = new Date();
    }

    addEventListener(type, listener) {
        return this.websocket && this.websocket.addEventListener(...arguments);
    }

    removeEventListener(type, listener) {
        return this.websocket && this.websocket.removeEventListener(...arguments);
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

module.exports = Session;