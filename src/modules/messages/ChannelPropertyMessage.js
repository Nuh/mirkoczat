class ChannelPropertyMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        if (!msg.data.key || !channel.hasProperty(msg.data.key)) {
            throw "Unknown property";
        }
        return channel.setProperty(msg.data.key, msg.data.value, msg.source.user);
    }
}

module.exports = ChannelPropertyMessage;