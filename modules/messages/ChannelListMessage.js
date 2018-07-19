class ChannelListMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        if (!msg.author.isOnline()) {
            throw "User is offline";
        }
        return this.channels.getAllCanJoin(msg.author);
    }
}

module.exports = ChannelListMessage;