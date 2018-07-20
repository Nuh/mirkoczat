const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Request extends EventEmitter2 {
    constructor(raw = null, user = null, session = null) {
        let json = JSON.parse(raw);

        super();
        this.raw = raw;
        this.type = json.type || 'unknown';
        this.data = json.data;
        this.author = user;
        this.session = session;
        this.created = new Date();

        validate();
    }

    validate() {
        if (this.user instanceof ctx('api.users.AbstractUser')) {
            if (this.session instanceof ctx('api.Session')) {
                if (!this.user.sessions.has(this.session) || !this.session.user.equals(this.user)) {
                    throw "Invalid session";
                }
            }
        } else if (this.session) {
            throw "Provided session but not user";
        }
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['session']), true);
    }
}

module.exports = Request;