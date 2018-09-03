class MyChannelsMessage {
    handle(msg) {
        return (msg.source.session || {}).channels;
    }
}

module.exports = MyChannelsMessage;