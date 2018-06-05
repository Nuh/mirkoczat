const User = require('./User');
const Wykop = require('../lib/Wykop')

class WykopUser extends User {

    constructor(socket, request, token) {
        super(socket, request);
        this.token = token;
    }

}

module.exports = WykopUser;