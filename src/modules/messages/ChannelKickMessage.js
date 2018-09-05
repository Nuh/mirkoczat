class ChannelKickMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        if (!channel.sessions.has(msg.source.session)) {
            throw "Session do not enter to channel";
        }
    }

    doHandle(msg) {
        let channel = this.channels.get(msg.data.channel);
        return channel.kick(msg.data.user, msg.data.reason, msg.source.user);
    }
}

module.exports = ChannelKickMessage;