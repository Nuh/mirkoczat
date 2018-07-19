const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Response extends EventEmitter2 {
    constructor(request, result = false, data = null) {
        super();

        this.request = request;
        this.data = data;
        this.result = !!result;
        this.created = new Date();
    }

    toString() {
        'xx'
    }
}

module.exports = Response;