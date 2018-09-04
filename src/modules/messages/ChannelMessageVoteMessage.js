class ChannelMessageVoteMessage extends ctx('api.channels.message.AbstractMessage') {
    prepare() {
        this.channels = this.context.getModule('channels');
    }

    doValidate(msg) {
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
    }

    doHandle(msg) {
        let channel = this.channels.get(msg.data.channel);
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