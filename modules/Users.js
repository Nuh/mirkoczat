class Users {

    constructor(context) {
        this.debug = Debug('USERS');
        this.context = context;
        this.instances = new Set();
    }

    get(user) {
        if (user instanceof ctx('api.users.AbstractUser') && !(user instanceof ctx('api.users.User'))) {
            return _([...this.instances]).find((i) => i.equals(user));
        }
        let username = user && user.username ? user.username : user;
        return _([...this.instances]).find((i) => i.username === username) || null;
    }

    has(user) {
        return !!this.get(user);
    }

    register(user) {
        if (this.has(user)) {
            return this.get(user).merge(user);
        }

        if (user.type === 'anonymous') {
            user.once('offline', () => this.unregister(user));
        }

        this.instances.add(user);
        this.debug('Registered a new user %o', user.username);
        return user;
    }

    unregister(user) {
        let currentUser = user;
        if (this.has(user)) {
            currentUser = this.register(user);
        }

        currentUser.terminate();
        if (this.instances.delete(currentUser)) {
            this.debug('Unregistered user %o', user.username);
        }
        return true;
    }

}

module.exports = Users;