class WhoIAmMessage extends ctx('api.channels.message.AbstractMessage') {
    doHandle(msg) {
        return msg.source.user;
    }
}

module.exports = WhoIAmMessage;