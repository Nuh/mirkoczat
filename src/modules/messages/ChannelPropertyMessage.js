class ChannelPropertyMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate(msg) {
        let channel = this.channels.get(msg.data.channel);
        if (!channel) {
            throw "Unknown channel";
        }
        if (!msg.data.key || !channel.hasProperty(msg.data.key)) {
            throw "Unknown property";
        }
    }

    doHandle(msg) {
        let channel = this.channels.get(msg.data.channel);
        return channel.setProperty(msg.data.key, msg.data.value, msg.source.user);
    }
}

module.exports = ChannelPropertyMessage;