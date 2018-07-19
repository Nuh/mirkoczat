class Users {

    constructor(context) {
        this.debug = Debug('USERS');
        this.context = context;
        this.instances = new Set();
    }

    prepare() {
        this.message = this.context.getModule('Message');
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

        this.instances.add(bindEvents(this, user));
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

let bindEvents = (users, user) => {
    if (!user || !user instanceof ctx('api.users.AbstractUser')) {
        return;
    }

    user.on('message', async (raw) => {
        let msg = users.message.parse(raw, user);
        if (msg) {
            let result = await users.message.handle(msg);
        }
        console.log(result);
    });

    if (user.type === 'anonymous') {
        user.once('offline', () => users.unregister(user));
    }

    return user;
};

module.exports = Users;

