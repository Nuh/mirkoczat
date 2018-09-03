let lastNumber = Math.floor(Math.random() * 10000);
let generateNick = () => `Anonymous-${_.padStart((lastNumber = lastNumber + Math.floor(Math.random() * 100)) % 10000, 4, '0')}`;
let normalizeNick = (data) => (data && data.nick ? data.nick : (data && data.login ? data.login : (data || '').toString())) || null;

class AnonymousAuth {
    constructor(parent) {
        this.isAvailable = (nick) => !parent.context.getModule('users').has(nick);
    }

    async validate(data) {
        let nick = normalizeNick(data);
        return !nick || this.isAvailable(nick);
    }

    async authorize(data) {
        let nick = normalizeNick(data);
        for (let i = 0; !nick && i < 10; ++i, nick = this.isAvailable(nick) ? nick : null) {
            nick = generateNick();
        }
        if (this.isAvailable(nick)) {
            return new (ctx('api.users.User'))(nick, null);
        }
        throw 'No available nickname to enter'
    }

    async login(response, params) {
        if (params && params.redirect) {
            response.writeHead(301, 'OK', {Location: params.redirect});
        }
    }

}

module.exports = AnonymousAuth;