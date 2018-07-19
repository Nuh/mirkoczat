const EventEmitter2 = require('eventemitter2').EventEmitter2;

class AbstractUser extends EventEmitter2 {
    constructor(username, sex) {
        if (new.target === AbstractUser) {
            throw new TypeError("Cannot construct AbstractUser instances directly");
        }

        super();

        this.type = this.constructor.name.toLowerCase().replace(/user$/, '') || 'anonymous';
        this.debug = Debug(`USER:${this.type.toUpperCase()}:${username}`);
        this.sessions = new Set();
        this.channels = new Set();

        this.username = username;
        this.sex = normalizeSex(sex);
    }

    merge(other) {
        if (this !== other && this.equals(other)) {
            for (let session of other.sessions) {
                this.sessions.add(session);
            }

            this.sex = other.sex;
        }
        return this;
    }

    equals(other) {
        return this === other || (other && this.construct === other.construct && this.username === other.username);
    }

    registerSession(session) {
        if (session && session instanceof ctx('api.Session')) {
            if (!this.sessions.has(session)) {
                let currentSessions = this.sessions.add(bindEvents(this, session)).size;
                bindEvents(this, session);

                // Events
                this.emit('connect', this);
                if (currentSessions === 1) {
                    this.emit('online', this);
                }

                // Debug
                this.debug('Registered a new session (IP: %s, all sessions: %d)', session.getClientInfo().prettyIp, currentSessions);
            }
            return this.sessions.has(session);
        }
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
        if (channel && channel instanceof String) {
            channel = _.find([...this.channels], (ch) => ch && ch.name === channel);
        }
        if (channel && channel instanceof ctx('api.channels.AbstractChannel') && this.channels.has(channel)) {
            this.debug('Leave %o channel because: %s', channel.name, reason || 'no reason');
            this.channels.delete(channel);
            return channel.left(this, reason);
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

let proxy = (list, funcName, ...args) => _.map([...list], (e) => ((e || {})[funcName] || _.noop).apply(e, args));

let normalizeSex = (sex) => {
    let s = (sex || '').toString().toLowerCase();
    if (new Set(['m', 'male']).has(s)) {
        return 'm';
    } else if (new Set(['f', 'female']).has(s)) {
        return 'f';
    } else if (new Set(['b', 'bot']).has(s)) {
        return 'b';
    }

    return null;
};

let bindEvents = (user, session) => {
    if (!session || !session instanceof ctx('api.Session')) {
        return;
    }

    session.once('close', (code, reason) => {
        session.removeAllListeners();
        session.terminate();
        if (user.sessions.has(session)) {
            user.sessions.delete(session);
            let currentSessions = user.sessions.size;

            // Events
            if (currentSessions <= 0) {
                _.each([...user.channels], (ch) => user.leave(ch, reason));
                user.emit('offline', user);
            }

            // Debug
            user.debug('Unregister a closed session, reason: %s (%d), remaining sessions: %d', reason || 'no reason', code, currentSessions);
        }
    });

    utils.proxy.event(session, user, 'message', 'close');

    return session;
};

module.exports = AbstractUser;