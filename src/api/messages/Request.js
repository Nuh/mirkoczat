class Request extends ctx('api.Observable') {
    constructor(raw = null, user = null, session = null) {
        let json = JSON.parse(raw);

        super();
        this.id = json.id || json.correlationId || json.correlation;
        this.raw = raw;
        this.type = json.type || 'unknown';
        this.data = json.data;
        this.source = {
            user: user,
            session: session
        };
        this.created = new Date();

        this.validate();
    }

    validate() {
        let user = this.source.user;
        let session = this.source.session;
        if (user instanceof ctx('api.users.AbstractUser')) {
            if (session instanceof ctx('api.Session')) {
                if (!user.sessions.has(session) || !session.user.equals(user)) {
                    throw "Invalid session";
                }
            }
        } else if (session) {
            throw "Provided session but not user";
        }
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['source']), true);
    }
}

module.exports = Request;