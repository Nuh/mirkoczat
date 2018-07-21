class AbstractUser extends ctx('api.Observable') {
    constructor(username, sex) {
        if (new.target === AbstractUser) {
            throw new TypeError("Cannot construct AbstractUser instances directly");
        }

        super();

        this.type = this.constructor.name.toLowerCase().replace(/user$/, '') || 'anonymous';
        this.debug = Debug(`USER:${this.type.toUpperCase()}:${username}`);
        this.sessions = new Set();

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

                // Events
                this.emit('connect', this);
                if (currentSessions === 1) {
                    this.emit('online', this);
                }

                // Debug
                this.debug('Registered a new session %o (all sessions: %d)', session.created.getTime(), currentSessions);
            }
            return this.sessions.has(session);
        }
    }

    isOnline() {
        return _.some(proxy(this.sessions, 'isOnline'));
    }

    getChannels() {
        return _(this.sessions).map((s) => s.channels).flattenDeep().sort().uniq().value();
    }

    join(channel) {
        return proxy(this.sessions, 'join', ...arguments);
    }

    leave(channel, reason) {
        return proxy(this.sessions, 'leave', ...arguments);
    }
    send(message) {
        return proxy(this.sessions, 'send', ...arguments);
    }

    close(code, reason) {
        return proxy(this.sessions, 'close', ...arguments);
    }

    terminate() {
        return proxy(this.sessions, 'terminate', ...arguments);
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['sessions', 'channels']), true);
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

    session.once('close', (session, code, reason) => {
        session.removeAllListeners();
        session.terminate();
        if (user.sessions.has(session)) {
            user.sessions.delete(session);
            let currentSessions = user.sessions.size;

            // Events
            if (currentSessions <= 0) {
                _.each([...session.channels], (ch) => session.leave(ch, reason));
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