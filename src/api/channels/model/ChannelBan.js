class ChannelBan {

    constructor(channel, user, reason, author) {
        this.channel = channel;
        this.user = user;
        this.reason = reason || null;
        this.author = author || null;
        this.reverted = null;
        this.created = new Date();

        this.validate();
    }

    validate() {
        if (!this.channel || !this.user) {
            throw 'No given channel or user to ban'
        }
        return true;
    }

    execute() {
        if (this.channel && this.user && !this.reverted) {
            this.user.leave(this.channel, `Banned by ${utils.extract.username(this.author)}`);
        }
        return this;
    }

    revert() {
        this.reverted = new Date();
        return this;
    }

}

module.exports = ChannelBan;