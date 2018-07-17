const debug = Debug('MIKROCZAT');
const url = require('url');
const WebSocket = require('ws');

class WebSocketInterface {
    constructor(strategy) {
        this.auth = strategy.app.getModule('auth');

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
                backlog: 1024,
                maxPayload: 4096,
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
                        let strategy = params.get('auth') || params.get('provider')
                        let token = params.get('token')

                        if (await this.auth.validate(strategy, token)) {
                            let user = await this.auth.authorize(info, strategy, token);
                            if (user) {
                                // TODO: do user
                                return typeof callback === 'function' ? callback(true) || true : true
                            }
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
            debug('%o', wss.clients.size)

            ws.on('message', function (message) {
                console.log('received: %s', message);
                ws.send(message)
            });

//            ws.send('something');
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