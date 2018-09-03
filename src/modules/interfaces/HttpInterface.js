const http = require('http');

class HttpInterface {
    constructor(parent) {
        this.debug = Debug('INTERFACE:HTTP');
        this.context = parent.context;

        this.server = http.createServer();
    }

    run() {
        this.server.listen({
            host: '0.0.0.0',
            port: 8080,
            backlog: 128
        }, () => this.debug('Server running on :8080'));
    }
}

module.exports = HttpInterface;