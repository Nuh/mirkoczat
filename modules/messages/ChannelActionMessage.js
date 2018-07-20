class ChannelActionMessage {
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
        let action = {
             channel: channel,
             type: msg.data.type || 'message',
             message: msg.data.message
         };
        return channel.send(new (ctx('api.messages.Action'))('channelaction', msg.author, action));
    }
}

module.exports = ChannelActionMessage;