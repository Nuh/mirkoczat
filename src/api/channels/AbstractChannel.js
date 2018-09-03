class AbstractChannel extends ctx('api.Observable') {
    constructor(name, user) {
        if (new.target === AbstractChannel) {
            throw new TypeError("Cannot construct AbstractChannel instances directly");
        }

        super();

        this.type = this.constructor.name.toLowerCase().replace(/channel$/, '') || 'global';
        this.debug = Debug(`CHANNEL:${this.type.toUpperCase()}:${name}`);
        this.users = new Set();
        this.sessions = new Set();

        this.name = (name || '');
        this.owner = user;
        this.properties = {
            topic: '',
            embed: ''
        };
        this.created = new Date();

        this.validate();

        this.debug('Created channel by %o', user && user.username ? user.username : user || 'SYSTEM');
    }

    validate() {
        if (!/^[A-Za-z]([A-Za-z0-9\-_]){2,34}$/.test(this.name)) {
            throw 'Channel name should have only basic chars and length between 3 and 35'
        }
        return true;
    }

    hasUser(user) {
        return _.isNil(user) || _.find([...this.users], (u) => u.username === utils.extract.username(user));
    }

    hasProperty(key) {
        return key in (this.properties || {});
    }

    getProperty(key) {
        if (key) {
            return (this.properties || {})[key];
        }
    }

    setProperty(key, value, user = null) {
        if (!this.hasUser(user)) {
            throw "User is not on the channel";
        }
        let oldValue = this.getProperty(key);
        if (!_.isEqual(oldValue, value)) {
            this.properties = this.properties || {};
            this.properties[key] = value;
            this.send(new (ctx('api.messages.Action'))('channelproperty', user, {channel: this, key: key, value: value, oldValue: oldValue}));
            this.debug('User %o changed property %s to %o (old: %o)', utils.extract.username(user), key, value, oldValue);
        }
        return this;
    }

    send(action) {
        return proxy(this.sessions, 'send', action);
    }

    isOnline(user) {
        return _([...this.sessions]).filter((s) => s.user.equals(user) && s.isOnline()).some();
    }

    canJoin(user) {
        return !!user;
    }

    join(session) {
        if (session && session instanceof ctx('api.Session') && session.user && session.user instanceof ctx('api.users.AbstractUser')) {
            if (!this.users.has(session.user) && this.canJoin(session.user)) {
                this.send(new (ctx('api.messages.Action'))('channeljoin', session.user, {name: this.name}));
                this.users.add(session.user);
                this.debug('User %o joined channel', utils.extract.username(session));
            }
            if (!this.sessions.has(session)) {
                this.sessions.add(session);
            }
            return this.sessions.has(session);
        }
    }

    left(session, reason) {
        if (session && session instanceof ctx('api.Session') && session.user && session.user instanceof ctx('api.users.AbstractUser')) {
            this.sessions.delete(session);
            if (!this.isOnline(session.user) && this.users.delete(session.user)) {
                this.send(new (ctx('api.messages.Action'))('channelleave', session.user, {name: this.name}));
                this.debug('User %o left channel because: %s', utils.extract.username(session), reason || 'no reason');
            }
            return !this.sessions.has(session);
        }
    }

    close(reason) {
        proxy(this.users, 'leave', this, `Closed channel - ${reason || 'no reason'}`);
        this.debug('Channel closed because: %s', reason || 'no reason');
        return true;
    }

    merge(other) {
        if (this !== other && this.equals(other)) {
            for (let user of other.users) {
                this.users.add(user);
            }

            this.owner = other.owner;
            this.created = other.created;
        }
        return this;
    }

    equals(other) {
        return this === other || (other && this.construct === other.construct && this.name.toLowerCase() === other.name.toLowerCase());
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['sessions']), true);
    }
}

let proxy = (list, funcName, ...args) => _.map([...list], (e) => ((e || {})[funcName] || _.noop).apply(e, args));

module.exports = AbstractChannel;