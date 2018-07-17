let normalizeSex = (sex) => {
    let s = (sex || '').toString().toLowerCase()
    if (['m', 'male'].indexOf(s) !== -1) {
        return 'm'
    } else if (['f', 'female'].indexOf(s) !== -1) {
        return 'f'
    } else if (['b', 'bot'].indexOf(s) !== -1) {
        return 'b'
    }

    return null;
}


class Authorization {
    constructor(socket, login, sex) {
        if (new.target === Authorization) {
            throw new TypeError("Cannot construct Authorization instances directly");
        }

        this.socket = socket;
        this.login = login;
        this.sex = normalizeSex(sex);
    }

}

module.exports = Authorization;