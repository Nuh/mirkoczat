class MyChannelsMessage {
    handle(msg) {
        return (msg.source.user || {}).channels;
    }
}

module.exports = MyChannelsMessage;