class ChannelListMessage extends ctx('api.channels.message.AbstractMessage') {
    doHandle(msg) {
        return _(this.channels.getAllCanJoin(msg.source.user))
            .filter((ch) => _.size(ch.users))
            .castArray()
            .value();
    }
}

module.exports = ChannelListMessage;