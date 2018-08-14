let isValidUsername = (username) => (username || '').toString().match(/^[A-Za-z]([A-Za-z0-9\-_]){2,34}$/);

class User extends ctx('api.users.AbstractUser') {
    constructor(username, sex) {
        super(username, null, sex);
        if (!isValidUsername(username)) {
            throw 'Username should have only basic chars and length between 3 and 35'
        }
    }
}

module.exports = User;