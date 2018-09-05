class PingMessage extends ctx('api.channels.message.AbstractMessage') {
    doHandle(msg) {
        return !!msg;
    }
}

module.exports = PingMessage;