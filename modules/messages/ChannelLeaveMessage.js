class ChannelLeaveMessage {
    handle(msg) {
        if (!msg.author.isOnline()) {
            throw "User is offline";
        }
        return msg.author.leave(msg.data.name, msg.data.reason);
    }
}

module.exports = ChannelLeaveMessage;