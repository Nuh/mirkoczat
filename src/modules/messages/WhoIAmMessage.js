class WhoIAmMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate() {
    }

    doHandle(msg) {
        return msg.source.user;
    }
}

module.exports = WhoIAmMessage;