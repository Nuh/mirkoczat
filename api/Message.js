const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Message extends EventEmitter2 {
    constructor(type = null, user = null, data) {
        let username = user && user.username ? user.username : user || 'SYSTEM';

        super();

        this.data = data;
        this.type = type || 'unknown';
        this.author = user;
        this.created = new Date();
    }
}

let proxy = (list, funcName, ...args) => _.map([...list], (e) => ((e || {})[funcName] || _.noop).apply(e, args));

module.exports = Message;