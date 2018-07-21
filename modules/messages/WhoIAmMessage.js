class WhoIAmMessage {
    handle(msg) {
        return msg.source.user;
    }
}

module.exports = WhoIAmMessage;