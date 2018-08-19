class ChannelLeaveMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        let session = msg.source.session;
        let channel = this.channels.get(msg.data.name, msg.source.user);
        if (!session.leave(msg.data.name, msg.data.reason)) {
            throw `Session did not joined to channel: ${msg.data.name}`
        }
        return channel || {type: 'global', name: name, users: []};
    }
}

module.exports = ChannelLeaveMessage;