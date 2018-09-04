class ChannelListMessage extends ctx('api.channels.message.AbstractMessage') {
    prepare() {
        this.channels = this.context.getModule('channels');
    }

    doValidate() {
    }

    doHandle(msg) {
        let channels = _.clone(this.channels.getAllCanJoin(msg.source.user));
        return _(channels).filter((ch) => _.size(ch.users)).map((ch) => {
            let channel = _.pick(_.clone(ch), ['name', 'type', 'users', 'created']);
            channel.users = _.size(channel.users);
            return channel;
        });
    }
}

module.exports = ChannelListMessage;