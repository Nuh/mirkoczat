class MyChannelsMessage {
    handle(msg) {
        return (msg.author || {}).channels;
    }
}

module.exports = MyChannelsMessage;