const EventEmitter2 = require('eventemitter2').EventEmitter2;

class AbstractChannel extends EventEmitter2 {
    constructor(name, user) {
        if (new.target === AbstractChannel) {
            throw new TypeError("Cannot construct AbstractChannel instances directly");
        }

        super();

        this.type = this.constructor.name.toLowerCase().replace(/channel$/, '') || 'global';
        this.debug = Debug(`CHANNEL:${this.type.toUpperCase()}:${name}`);
        this.users = new Set();

        this.name = name;
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
        if (!/^[A-Za-z0-9-_]{3,}$/.test(this.name)) {
            throw 'Channel name should have only "A-Za-z0-9-_" chars and minimum 3 length'
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
        return proxy(this.users, 'send', action);
    }

    canJoin(user) {
        return !!user;
    }

    join(user) {
        if (user && user instanceof String) {
            user = _.find(this.users, (u) => u.username === user);
        }
        if (user && user instanceof ctx('api.users.AbstractUser')) {
            if (!this.users.has(user) && this.canJoin(user)) {
                this.send(new (ctx('api.messages.Action'))('channeljoin', user, {name: this.name}));
                this.users.add(user);
                this.debug('User %o joined channel', user.username);
            }
            return this.users.has(user);
        }
    }

    left(user, reason) {
        if (user && user instanceof String) {
            user = _.find(this.users, (u) => u.username === user);
        }
        if (user && user instanceof ctx('api.users.AbstractUser')) {
            if (this.users.delete(user)) {
                this.send(new (ctx('api.messages.Action'))('channelleave', user, {name: this.name}));
                this.debug('User %o left channel because: %s', user.username, reason || 'no reason');
                return true;
            }
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
        return this === other || (other && this.construct === other.construct && this.name === other.name);
    }
}

let proxy = (list, funcName, ...args) => _.map([...list], (e) => ((e || {})[funcName] || _.noop).apply(e, args));

module.exports = AbstractChannel;