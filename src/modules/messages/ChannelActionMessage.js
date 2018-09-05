class ChannelActionMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        if (!channel.sessions.has(msg.source.session)) {
            throw "Session do not enter to channel";
        }
        if(msg.data.type && ['message', 'me'].indexOf(msg.data.type) === -1) {
            throw "Unknown type of channel action"
        }
    }

    doHandle(msg) {
        let channel = this.channels.get(msg.data.channel);
        let action = {
             channel,
             type: msg.data.type || 'message',
             message: msg.data.message
        };
        return channel.send(new (ctx('api.messages.Action'))('channelaction', msg.source.user, action));
    }
}

module.exports = ChannelActionMessage;