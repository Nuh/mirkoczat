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

class AbstractUser {
    constructor(username, sex) {
        if (new.target === AbstractUser) {
            throw new TypeError("Cannot construct AbstractUser instances directly");
        }

        this.username = username;
        this.sex = normalizeSex(sex);

        this.sockets = new Set();
    }

    merge(other) {
        if (this.equals(other)) {
            this.sex = other.sex || this.sex;
            this.sockets = new Set([...this.sockets, ...other.sockets]);
        }
        return this;
    }

    equals(other) {
        return other && this.construct === other.construct && this.username === other.username;
    }
}

module.exports = AbstractUser;