const uuid = require('uuid');

class Action {
    constructor(type = null, author = null, data) {
        this.id = uuid.v4();
        this.type = type || 'unknown';
        this.author = author;
        this.data = data;
        this.created = new Date();
    }
}

module.exports = Action;