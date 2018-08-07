const md5 = require('crypto-js/md5');
const WykopAPI = require('wykop-api-client');

const WYKOP_KEY_PROPERTY = 'auth:wykop:key';
const WYKOP_SECRET_PROPERTY = 'auth:wykop:secret';

let parseToken = (data) => {
    try {
        let json = Buffer.from(data, 'base64').toString();
        return _.extend(JSON.parse(json), {data: data});
    } catch (e) {
        throw 'Bad syntax of token'
    }
};

class WykopAuth {
    constructor(parent) {
        parent.context.config.require(WYKOP_KEY_PROPERTY, WYKOP_SECRET_PROPERTY);

        this.config = {
            key: parent.context.property(WYKOP_KEY_PROPERTY),
            secret: parent.context.property(WYKOP_SECRET_PROPERTY)
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

    async authorize(data) {
        let token = parseToken(data);
        try {
            if (this.client) {
                let data = await this.client.request({type: 'user', method: 'login', postParams: {login: token.login, accountkey: token.token}});
                return new (ctx('api.users.WykopUser'))(data);
            }
        } catch (e) {
            throw `${e && e.error && e.error.message ? `API response - ${e.error.code}# ${e.error.message}` : (e && e.message ? e.message : e)} (login: ${token.login})`;
        }
        throw 'Invalid token';
    }

    async login(response, params) {
        let redirect = (params || {}).redirect;
        response.writeHead(301, 'OK', {Location: `https://a.wykop.pl/user/connect/appkey,${this.config.key}${redirect ? `,redirect,${Buffer.from(redirect).toString('base64')},secure,${md5(`${this.config.secret}${redirect}`, 'hex').toString()}` : ''}`});
    }

}

module.exports = WykopAuth;