const debug = Debug('MIKROCZAT');
const WykopAPI = require('wykop-api-client');
const md5 = require('crypto-js/md5');

const WYKOP_KEY_PROPERTY = 'auth:wykop:key';
const WYKOP_SECRET_PROPERTY = 'auth:wykop:secret';

let parseToken = (data) => {
    try {
        let json = Buffer.from(data, 'base64').toString();
        return _.extend(JSON.parse(json), {data: data});
    } catch (e) {
        throw 'Bad syntax of token'
    }
}

class WykopAuth {
    constructor(auth) {
        auth.app.config.require(WYKOP_KEY_PROPERTY, WYKOP_SECRET_PROPERTY)

        this.client = null;
        this.config = {
            key: auth.app.property(WYKOP_KEY_PROPERTY),
            secret: auth.app.property(WYKOP_SECRET_PROPERTY)
        };
    }

    prepare() {
        this.client = new WykopAPI(this.config);
    }

    async validate(data) {
        let token = parseToken(data);
        if (token instanceof Object && token.appkey && token.login && token.token) {
            return token.sign && _.isEqual(token.sign, md5(`${this.config.secret}${token.appkey}${token.login}${token.token}`, 'hex').toString());
        }
        return false;
    }

    async authorize(user, data) {
        if (await this.validate(data) && this.client) {
            let token = parseToken(data);
            try {
                let data = await this.client.request({type: 'user', method: 'login', postParams: {login: token.login, accountkey: token.token}});
                return new (ctx('api.user.authorizations.WykopAuthorization'))(user, data);
            } catch (e) {
                throw e && e.error && e.error.message ? `API response - ${e.error.code}# ${e.error.message}` : (e && e.message ? e.message : e);
            }
        }
        throw 'Invalid token';
    }

}

module.exports = WykopAuth;