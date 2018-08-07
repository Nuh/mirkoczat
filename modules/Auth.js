const Url = require('url');

const MODULES_PATH = `${__dirname}/auths`;
const ALLOWED_REDIRECT_KEY_PROPERTY = 'auth:redirect:allowed';
const DEFAULT_REDIRECT_KEY_PROPERTY = 'auth:redirect:default';

class Auth extends ctx('api.modularize.AbstractStrategized') {

    constructor(context) {
        super('AUTH', MODULES_PATH);
        this.context = context;
        this.loadModules();
    }

    dependency() {
        return ['users', 'interface'];
    }

    run() {
        let server = this.context.getModule('interface').getStrategy('http').server;
        server.on('request', async (req, res) => {
            let url = Url.parse(req.url, true, true);
            let defaultRedirect = this.context.property(DEFAULT_REDIRECT_KEY_PROPERTY);
            if (url.pathname === '/login') {
                let allowed = this.context.property(ALLOWED_REDIRECT_KEY_PROPERTY);
                let channel = url.query.channel || url.query.strategy || 'anonymous';
                let params = _.extend(_.cloneDeep(url.query), {
                    redirect: checkRedirect(url.query.redirect, allowed) || defaultRedirect
                });

                if (req.method === 'POST') {
                    // TODO: other login strategy...
                }

                await this.login(channel, res, params);
            } else if (defaultRedirect) {
                res.writeHead(301, 'Unknown operation', {Location: defaultRedirect});
            } else {
                res.writeHead(400, 'Unknown operation');
            }
            res.end();
        });
    }

    async login(channel, response, params) {
        try {
            let strategy = this.getStrategy(channel);
            let isValid = await strategy.login(response, params);
            return !!isValid;
        } catch (msg) {
            this.debug('Failed login via %s data: %o\nReason: %s', channel, params, msg);
            return false;
        }
    }

    async validate(channel, data) {
        try {
            let strategy = this.getStrategy(channel);
            let isValid = await strategy.validate(data);
            return !!isValid;
        } catch (msg) {
            this.debug('Failed validate via %s data: %o\nReason: %s', channel, data, msg);
            return false;
        }
    }

    async authorize(channel, data) {
        if (await this.validate(channel, data)) {
            try {
                let strategy = this.getStrategy(channel);
                let auth = this.context.getModule('users').register(await strategy.authorize(data));
                this.debug('Successful log in %o via %s', auth.username, channel);
                return auth;
            } catch (msg) {
                this.debug('Failed authorize via %s data: %o\nReason: %s', channel, data, msg);
                throw msg;
            }
        }
    }

}

const checkRedirect = (url, allowed) => {
    let requestedUrl = Url.parse(url || '', true, true);
    let isAllowed = _(allowed)
        .toArray()
        .flattenDeep()
        .map((domain) => Url.parse(domain.startsWith('//') || domain.includes('://') ? domain : `//${domain}`, true, true))
        .map((domain) => _(domain).omit(['auth', 'hash', 'host', 'href', 'search', 'query', 'slashes']).pickBy(_.identity).value())
        .some((domain) => _.every(domain, (value, key) => _.isEqual(requestedUrl[key], value)));
    if (isAllowed) {
        return url;
    }
};

module.exports = Auth;