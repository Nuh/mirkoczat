class WykopUser extends ctx('api.users.AbstractUser') {

    constructor(data) {
        super(data.login, data.avatar_lo, data.avatar_big, data.sex);
        this.data = data;
    }

    merge(other) {
        if (this.equals(other)) {
            this.data = other.data || this.data;
        }
        return super.merge(this);
    }

}

module.exports = WykopUser;