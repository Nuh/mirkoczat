class ChannelKick {

    constructor(channel, user, reason, author) {
        this.channel = channel;
        this.user = user;
        this.reason = reason || null;
        this.author = author || null;
        this.created = new Date();

        this.validate();
    }

    validate() {
        if (!this.channel || !this.user) {
            throw 'No given channel or user to kick'
        }
        return true;
    }

    execute() {
        if (this.channel && this.user) {
            let user = this.channel.getUser(this.user) || this.user;
            if (user && user.leave instanceof Function) {
                user.leave(this.channel, `Kicked by ${utils.extract.username(this.author)}, reason: ${this.reason || 'no reason'}`);
            }
        }
        return this;
    }

}

module.exports = ChannelKick;