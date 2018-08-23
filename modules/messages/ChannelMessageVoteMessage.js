class ChannelMessageVoteMessage {
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
        if (!msg.data.messageId) {
            throw "Unknown message";
        }
        let action = {
             channel: channel.name,
             type: msg.data.type || 'message',
             messageId: msg.data.messageId,
             sign: msg.data.sign || 'plus'
         };
        return channel.send(new (ctx('api.messages.Action'))('channelmessagevote', msg.source.user, action));
    }
}

module.exports = ChannelMessageVoteMessage;