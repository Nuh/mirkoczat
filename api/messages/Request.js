const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Request extends EventEmitter2 {
    constructor(raw = null, user = null) {
        let json = JSON.parse(raw);

        super();
        this.raw = raw;
        this.type = json.type || 'unknown';
        this.data = json.data;
        this.author = user;
        this.created = new Date();
    }
}

module.exports = Request;