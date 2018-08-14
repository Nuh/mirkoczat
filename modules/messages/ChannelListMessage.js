class ChannelListMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        let channels = _.clone(this.channels.getAllCanJoin(msg.source.user));
        return _(channels).filter((ch) => _.size(ch.users)).map((ch) => {
            let channel = _.pick(_.clone(ch), ['name', 'type', 'users', 'created']);
            channel.users = _.size(channel.users);
            return channel;
        });
    }
}

module.exports = ChannelListMessage;