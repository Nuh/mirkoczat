class Action extends ctx('api.Observable') {
    constructor(type = null, author = null, data) {
        super();

        this.type = type || 'unknown';
        this.author = author;
        this.data = data;
        this.created = new Date();
    }
}

module.exports = Action;