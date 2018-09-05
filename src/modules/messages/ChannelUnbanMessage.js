class ChannelBanMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        if (!channel.sessions.has(msg.source.session)) {
            throw "Session do not enter to channel";
        }
        if (!channel.isBanned(msg.data.user)) {
            throw "User is not banned on channel";
        }
    }

    doHandle(msg) {
        let channel = this.channels.get(msg.data.channel);
        return channel.unban(msg.data.user, msg.source.user);
    }
}

module.exports = ChannelBanMessage;