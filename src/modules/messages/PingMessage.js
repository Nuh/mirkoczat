class PingMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate() {
    }

    doHandle(msg) {
        return !!msg;
    }
}

module.exports = PingMessage;