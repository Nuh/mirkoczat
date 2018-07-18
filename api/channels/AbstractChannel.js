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
        this.created = new Date();

        this.debug('Created channel by %o', user && user.username ? user.username : user || 'SYSTEM');
    }

    canJoin() {
        return true;
    }

    join(user) {
        if (user && user instanceof String) {
            user = _.find(this.users, (u) => u.username === user);
        }
        if (user && user instanceof ctx('api.users.AbstractUser')) {
            if (!this.users.has(user) && this.canJoin(user)) {
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