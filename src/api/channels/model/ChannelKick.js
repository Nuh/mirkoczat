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
            this.user.leave(this.channel, `Kicked by ${utils.extract.username(this.author)}`);
        }
        return this;
    }

}

module.exports = ChannelKick;