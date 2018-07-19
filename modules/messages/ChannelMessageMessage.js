class ChannelMessageMessage {
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
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        return channel.send(new (ctx('api.messages.Action'))('channelmessage', msg.author, {channel: channel, message: msg.data.message}));
    }
}

module.exports = ChannelMessageMessage;