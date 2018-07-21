class ChannelLeaveMessage {
    handle(msg) {
        return msg.source.session.leave(msg.data.name, msg.data.reason);
    }
}

module.exports = ChannelLeaveMessage;