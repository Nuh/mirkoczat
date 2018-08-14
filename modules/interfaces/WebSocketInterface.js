const url = require('url');
const WebSocket = require('ws');

class WebSocketInterface {
    constructor(parent) {
        this.debug = Debug('INTERFACE:WEBSOCKET');
        this.context = parent.context;

        // DATA
        this.server = {
            enabled: true,
            socket: null,
            channels: [],
            users: []
        };
        this.channels = {};
    }

    prepare() {
        this.auth = this.context.getModule('auth');
        this.users = this.context.getModule('users');
        this.channels = this.context.getModule('channels');
    }

    configureServer() {
        if (!this.server.socket) {
            let httpServer = this.context.getModule('interface').getStrategy('http').server;
            let wsServer = this.server.socket = new WebSocket.Server({
                noServer: true,
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
                        let strategy = params.get('strategy') || params.get('auth') || params.get('provider') || 'anonymous';
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

            httpServer.on('upgrade', (req, res, headers) => {
                wsServer.handleUpgrade(req, res, headers, (ws) => wsServer.emit('connection', ws, req));
            });
        }
        return this.server.socket;
    }

    run() {
        let wss = this.configureServer();
        wss.on('connection', (ws, req) => {
            try {
                let user = req.connection.authorize;
                let session = new (ctx('api.Session'))(ws, req, user);
                user.registerSession(session);
            } catch (e) {
                try {
                    ws.terminate();
                } catch (e) {
                    // ignore
                }

                this.debug('Force terminate session because catch exception:\n%O', e)
            }
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