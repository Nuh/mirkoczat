class MyChannelsMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate() {
    }

    doHandle(msg) {
        return (msg.source.session || {}).channels;
    }
}

module.exports = MyChannelsMessage;