class ChannelLeaveMessage {
    handle(msg) {
        if (!msg.source.session.leave(msg.data.name, msg.data.reason)) {
            throw `Session did not joined to channel: ${msg.data.name}`
        }
        return msg.data.name;
    }
}

module.exports = ChannelLeaveMessage;