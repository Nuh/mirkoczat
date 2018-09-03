class Channels {

    constructor(context) {
        this.debug = Debug('CHANNELS');
        this.context = context;
        this.instances = new Set();
    }

    get(channel) {
        if (channel instanceof ctx('api.channels.AbstractChannel')) {
            return _([...this.instances]).find((i) => i && i.equals(channel));
        }
        let name = (channel && channel.name ? channel.name : channel).toString().toLowerCase();
        return _([...this.instances]).find((i) => i && i.name.toLowerCase() === name) || null;
    }

    getOfTypes(type) {
        return _([...this.instances]).filter((i) => i && i.type === type).value() || [];
    }

    getAllCanJoin(user) {
        return _([...this.instances]).filter((i) => i && i.canJoin && i.canJoin(user)).value() || [];
    }

    has(channel) {
        return !!this.get(channel);
    }

    register(name, user) {
        let channel;
        if (this.has(name)) {
            channel = this.get(name);
        } else {
            channel = new (ctx('api.channels.Channel'))(name, user);
            this.instances.add(channel);
            this.debug('Create a new channel %o by %s', name, user && user.username ? user.username : user || 'SYSTEM');
        }
        return channel;
    }

    unregister(channel, reason) {
        if (this.has(channel)) {
            let ch = this.get(channel);
            let owned = ch && ch.owner && ch.owner.username ? ch.owner.username : ch.owner || 'SYSTEM';
            ch.close(reason);
            this.instances.delete(ch);
            this.debug('Remove channel %o owned by %s', ch.name, owned);
            return true;
        }
        return channel instanceof ctx('api.channels.AbstractChannel') && channel.close instanceof Function && channel.close();
    }

}

module.exports = Channels;