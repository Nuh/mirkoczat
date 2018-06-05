const debug = Debug('MIKROCZAT');
const WebSocket = require('ws');

class WebSocketInterface extends AbstractCoreModule {
    constructor(applicationInstance) {
        super(applicationInstance);

        // DATA
        this.server = {
            enabled: true,
            socket: null,
            channels: [],
            users: []
        }
        this.channels = {};
    }

    dependency() {
        return ['auth'];
    }

    prepare() {
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
            verifyClient: (info, callback) => {
                let callbackCallerFactory = (code, message) => (callback) => typeof callback === 'function' ? callback(false, code, message, {'Retry-After': 300}) && false : false
                let disabled = callbackCallerFactory(1001, 'The server is not accepting new connections at this time'),
                    deny = callbackCallerFactory(1008, 'Policy violation detected')

                if (!this.server.enabled) {
                    return disabled(callback);
                }

                return typeof callback === 'function' ? callback(true) || true : true
            }
        });
    }

    run() {
        let wss = this.server.socket;
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