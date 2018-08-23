const uuid = require('uuid');

class Action extends ctx('api.Observable') {
    constructor(type = null, author = null, data) {
        super();

        this.id = uuid.v4();
        this.type = type || 'unknown';
        this.author = author;
        this.data = data;
        this.created = new Date();
    }
}

module.exports = Action;