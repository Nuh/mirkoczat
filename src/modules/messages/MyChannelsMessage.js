class MyChannelsMessage extends ctx('api.channels.message.AbstractMessage') {
    doHandle(msg) {
        return _.map([...(msg.source.session.channels || [])], ch => ch.toFullResponse());
    }
}

module.exports = MyChannelsMessage;