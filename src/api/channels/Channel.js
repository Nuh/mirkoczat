class Channel extends ctx('api.channels.AbstractChannel') {

    constructor(name, user) {
        super(name, user);

        this.roles = new Set();
        this.banned = new Set();
    }

    canJoin(user) {
        return super.canJoin(user) && !this.isBanned(user);
    }

    isBanned(user) {
        return user && _.find(this.banned, (b) => b && b.user && b.user.is(user));
    }

    kick(user, reason, author = null) {
        if (!this.hasUser(author)) {
            throw 'User is not on the channel';
        }
        if (user && user.equals(author)) {
            throw 'You can not kick yourself';
        }
        if (user && this.hasUser(user)) {
            let model = new (ctx('api.channels.model.ChannelKick'))(this, user, reason, author);
            if (model && model.channel === this) {
                return model.execute();
            }
        }
    }

    ban(user, reason, author = null) {
        if (!this.hasUser(author)) {
            throw 'User is not on the channel';
        }
        if (user && user.equals(author)) {
            throw 'You can not ban yourself'
        }
        if (user && this.owner.equals(user)) {
            throw 'You can not ban channel owner'
        }
        if (user && !this.isBanned(user)) {
            let model = new (ctx('api.channels.model.ChannelBan'))(this, user, reason, author);
            if (model && model.channel === this) {
                this.banned.add(model);
                return model.execute();
            }
        }
    }

    unban(user, author = null) {
        if (user && user.equals(author)) {
            throw 'You can not unban yourself';
        }
        if (!this.isBanned(user)) {
            throw 'User is not banned';
        }
        let ban = _.find(this.banned, (b) => b && b.user && b.user.is(user));
        if (ban) {
            this.banned.delete(ban);
            return ban.revert();
        }
    }

}

module.exports = Channel;