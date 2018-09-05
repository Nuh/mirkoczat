class ChannelJoinMessage extends ctx('api.channels.message.AbstractMessage') {
    doHandle(msg) {
        let session = msg.source.session;
        let channel = this.channels.register(msg.data.channel, msg.source.user);
        session.join(channel);
        return channel.toFullResponse();
    }
}

module.exports = ChannelJoinMessage;