const EventEmitter2 = require('eventemitter2').EventEmitter2;

let proxy = (list, funcName, ...args) => _(list).map((e) => ((e || {})[funcName] || _.noop).apply(e, args)).value();
let normalizeSex = (sex) => {
    let s = (sex || '').toString().toLowerCase()
    if (['m', 'male'].indexOf(s) !== -1) {
        return 'm'
    } else if (['f', 'female'].indexOf(s) !== -1) {
        return 'f'
    } else if (['b', 'bot'].indexOf(s) !== -1) {
        return 'b'
    }

    return null;
}

class AbstractUser extends EventEmitter2 {
    constructor(username, sex) {
        if (new.target === AbstractUser) {
            throw new TypeError("Cannot construct AbstractUser instances directly");
        }

        super();
        this.username = username;
        this.sex = normalizeSex(sex);
        this.type = this.constructor.name.toLowerCase().replace(/user$/, '') || 'anonymous';

        this.debug = Debug(`USER:${this.type.toUpperCase()}:${username}`)
        this.sessions = [];
    }

    merge(other) {
        if (this.equals(other)) {
            this.sex = other.sex || this.sex;
            this.sessions = [...(new Set([...this.sessions, ...other.sessions]))];
        }
        return this;
    }

    equals(other) {
        return other && this.construct === other.construct && this.username === other.username;
    }

    registerSession(session) {
        if (session && session instanceof ctx('api.users.Session') && this.sessions.indexOf(session) === -1) {
            session.addEventListener('close', (e) => {
                _.remove(this.sessions, (s) => s === session);
                let currentSessions = _.size(this.sessions);

                // Events
                this.emit('close', this);
                if (currentSessions <= 0) {
                    this.emit('offline', this);
                }

                // Debug
                this.debug('Unregister a closed session, reason: %s (%d), remaining sessions: %d', e.reason || 'no reason', e.code, currentSessions);
            });

            this.sessions.push(session);
            let currentSessions = _.size(this.sessions);

            // Events
            this.emit('connect', this);
            if (currentSessions == 1) {
                this.emit('online', this);
            }

            // Debug
            this.debug('Registered a new session (IP: %s, all sessions: %d)', session.getClientInfo().prettyIp, currentSessions)

            return true;
        }
    }

    isOnline() {
        return _.some(proxy(this.sessions, 'isOnline'));
    }

    close(code, reason) {
        return proxy(this.sessions, 'close', ...arguments);
    }

    terminate() {
        return proxy(this.sessions, 'terminate', ...arguments);
    }

}

module.exports = AbstractUser;