class Channel extends ctx('api.channels.AbstractChannel') {
    constructor(name, user) {
        super(name, user);

        if (!/^[A-Za-z0-9-_]{3}$/.test(name)) {
            throw "Channel name is invalid";
        }
    }
}

module.exports = Channel;