const url = require('url');
const WebSocket = require('ws');

class WebSocketInterface {
    constructor(parent) {
        this.auth = parent.context.getModule('auth');
        this.users = parent.context.getModule('users');
        this.debug = Debug('INTERFACE:WEBSOCKET');

        // DATA
        this.server = {
            enabled: true,
            socket: null,
            channels: [],
            users: []
        }
        this.channels = {};
    }

    configureServer() {
        if (!this.server.socket) {
            this.server.socket = new WebSocket.Server({
                host: '0.0.0.0',
                port: 8080,
                backlog: 128,
                maxPayload: 4096,
                clientTracking: true,
                perMessageDeflate: {
                    zlibDeflateOptions: {
                        chunkSize: 1024,
                        memLevel: 7,
                        level: 3
                    },
                    zlibInflateOptions: {
                        chunkSize: 10 * 1024
                    },
                    clientNoContextTakeover: true,
                    serverNoContextTakeover: true,
                    clientMaxWindowBits: 10,
                    serverMaxWindowBits: 10
                },
                verifyClient: async (info, callback) => {
                    let callbackCallerFactory = (code, message) => (callback) => typeof callback === 'function' ? callback(false, code, message, {'Retry-After': 300}) && false : false
                    let disabled = callbackCallerFactory(1001, 'The server is not accepting new connections at this time'),
                        deny = callbackCallerFactory(1008, 'Policy violation detected'),
                        badCredentials = callbackCallerFactory(4003, 'You don\'t have access to server or unauthorized');

                    if (!this.server.enabled) {
                        return disabled(callback);
                    }

                    try {
                        let params = new url.URLSearchParams(url.parse(info.req.url).search);
                        let strategy = params.get('auth') || params.get('provider') || 'anonymous';
                        let token = params.get('token') || params.get('nick');
                        let user = await this.auth.authorize(strategy, token);
                        if (user) {
                            info.req.connection.authorize = user;
                            return typeof callback === 'function' ? callback(true) || true : true;
                        }
                    } catch (e) {
                        return callbackCallerFactory(1011, e && e.message ? e.message : e)(callback);
                    }

                    return badCredentials(callback);
                }
            });
        }
        return this.server.socket;
    }

    run() {
        let wss = this.configureServer();
        wss.on('connection', (ws, req) => {
            try {
                let user = req.connection.authorize;
                let session = new (ctx('api.users.Session'))(ws, req, user);
                user.registerSession(session);
            } catch (e) {
                ws.terminate();
                this.debug('Force terminate session because catch exception: %o', e)
            }

            ws.on('message', function (message) {
                console.log('received: %s', message);
                ws.send(message)
            });
        });
    }

    broadcast(data) {
        if (this.ws) {
            this.ws.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
        }
    }
}

module.exports = WebSocketInterface;