const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Action extends EventEmitter2 {
    constructor(type = null, author = null, data) {
        super();

        this.type = type || 'unknown';
        this.author = author;
        this.data = data;
        this.created = new Date();
    }
}

module.exports = Action;