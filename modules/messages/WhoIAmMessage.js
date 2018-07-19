class WhoIAmMessage {
    handle(msg) {
        return msg.author;
    }
}

module.exports = WhoIAmMessage;