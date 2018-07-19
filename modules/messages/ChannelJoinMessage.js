class ChannelJoinMessage {
    constructor(parent) {
        this.debug = Debug('MESSAGE:CHANNEL-JOIN');
        this.context = parent.context;
    }

    prepare() {
        this.auth = this.context.getModule('auth');
        this.users = this.context.getModule('users');
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        return this.channels.register(msg.data.name, msg.user);
    }
}

module.exports = ChannelJoinMessage;