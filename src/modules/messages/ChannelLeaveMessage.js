class ChannelLeaveMessage extends ctx('api.channels.message.AbstractMessage') {
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
    }

    doHandle(msg) {
        let session = msg.source.session;
        let channel = this.channels.get(msg.data.name, msg.source.user);
        if (!session.leave(msg.data.name, msg.data.reason)) {
            throw `Session did not joined to channel: ${msg.data.name}`
        }
        return channel || {type: 'global', name: name, users: []};
    }
}

module.exports = ChannelLeaveMessage;