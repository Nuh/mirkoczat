class Users {

    constructor(context) {
        this.context = context;
        this.instances = new Set();
    }

    get(user) {
        if (user instanceof ctx('api.users.AbstractUser') && !(user instanceof ctx('api.users.User'))) {
            return _(this.instances).find((i) => i.equals(user));
        }
        let username = user && user.username ? user.username : user;
        return username instanceof String ? _(this.instances).find((i) => i.username === username) : null;
    }

    has(user) {
        return !!this.get(user);
    }

    register(user) {
        if (this.has(user)) {
            return this.get(user).merge(user);
        }

        this.instances.add(user);
        return user;
    }

    unregister(user) {
        let currentUser = user;
        if (this.has(user)) {
            currentUser = this.register(user);
        }

        this.instances.delete(currentUser);
        return currentUser.disconnect();
    }

}

module.exports = Users;