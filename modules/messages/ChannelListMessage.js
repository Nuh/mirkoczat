class ChannelListMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        return this.channels.getAllCanJoin(msg.source.user);
    }
}

module.exports = ChannelListMessage;