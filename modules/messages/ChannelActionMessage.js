class ChannelActionMessage {
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
        if (!channel.sessions.has(msg.source.session)) {
            throw "Session do not enter to channel";
        }
        let action = {
             channel: channel.name,
             type: msg.data.type || 'message',
             message: msg.data.message
         };
        return channel.send(new (ctx('api.messages.Action'))('channelaction', msg.source.user, action));
    }
}

module.exports = ChannelActionMessage;