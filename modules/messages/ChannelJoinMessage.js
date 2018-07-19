class ChannelJoinMessage {
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
        return this.channels.register(msg.data.name, msg.author);
    }
}

module.exports = ChannelJoinMessage;