class ChannelJoinMessage extends ctx('api.channels.message.AbstractMessage') {
    prepare() {
        this.channels = this.context.getModule('channels');
    }

    doValidate(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (channel.sessions.has(msg.source.session)) {
            throw "Session has entered to channel";
        }
    }

    doHandle(msg) {
        let session = msg.source.session;
        let channel = this.channels.register(msg.data.name, msg.source.user);
        session.join(channel);
        return channel;
    }
}

module.exports = ChannelJoinMessage;