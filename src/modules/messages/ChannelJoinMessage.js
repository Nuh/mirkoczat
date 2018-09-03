class ChannelJoinMessage {
    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    handle(msg) {
        let session = msg.source.session;
        let channel = this.channels.register(msg.data.name, msg.source.user);
        if (session && session instanceof ctx('api.Session')) {
            session.join(channel);
        }
        return channel;
    }
}

module.exports = ChannelJoinMessage;