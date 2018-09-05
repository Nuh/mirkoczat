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
        return user && !!this.getBan(user);
    }

    getBan(user) {
        if (user) {
            return _.find([...this.banned], (b) => b && b.user && utils.extract.username(b.user) === utils.extract.username(user));
        }
    }

    kick(user, reason, author = null) {
        if (user && (typeof user === 'string' || user instanceof String)) {
            user = this.getUser(user);
        }
        if (!this.hasUser(author)) {
            throw 'User is not on the channel';
        }
        if (user && author.is(user)) {
            throw 'You cannot kick yourself';
        }
        if (user && this.hasUser(user)) {
            let kick = new (ctx('api.channels.model.ChannelKick'))(this, user, reason, author);
            if (kick && kick.channel === this) {
                kick.execute();
                this.send(new (ctx('api.messages.Action'))('channelkick', user, {channel: this, author, reason}));
                this._debug('User %o kicked by %s because: %s', utils.extract.username(user), utils.extract.username(author), reason || 'no reason');
                return kick;
            }
        }
    }

    ban(user, reason, author = null) {
        if (!this.hasUser(author)) {
            throw 'User is not on the channel';
        }
        if (user && author.is(user)) {
            throw 'You cannot ban yourself'
        }
        if (user && this.owner.is(user)) {
            throw 'You cannot ban channel owner'
        }
        if (user && !this.isBanned(user)) {
            let ban = new (ctx('api.channels.model.ChannelBan'))(this, user, reason, author);
            if (ban && ban.channel === this) {
                this.banned.add(ban);
                ban.execute();
                this.send(new (ctx('api.messages.Action'))('channelban', user, {channel: this, author, reason}));
                this._debug('User %o banned by %s because: %s', utils.extract.username(user), utils.extract.username(author), reason || 'no reason');
                return ban;
            }
        }
    }

    unban(user, author = null) {
        if (user && author.is(user)) {
            throw 'You cannot unban yourself';
        }
        if (!this.isBanned(user)) {
            throw 'User is not banned';
        }
        let ban = this.getBan(user);
        if (ban) {
            this.banned.delete(ban);
            ban.revert();
            this.send(new (ctx('api.messages.Action'))('channelunban', user, {channel: this, author}));
            this._debug('User %o unbanned by %s, previously banned by %o because: %s', utils.extract.username(user), utils.extract.username(author), utils.extract.username(ban.author), ban.reason || 'no reason');
            return ban;
        }
    }

    toFullResponse() {
        return utils.convert.toResponse(_.omit(this, ['sessions', 'banned']), true);
    }
}

module.exports = Channel;