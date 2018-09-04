class Role extends ctx('api.Observable') {
    constructor(name, ...permissions) {
        super();

        this.name = name;
        this.permissions = _(permissions)
                            .flattenDeep()
                            .compact()
                            .unique()
                            .sort()
                            .value() || [];

        this.validate();
    }

    validate() {
        if (!name) {
            throw "No given name of Role";
        }
    }

    has(permission) {
        return !!_(this.permissions).find((p) => p.is(permission));
    }

    can(permission, action, ...args) {
        return this.canAny(permission, action, ...args);
    }

    canAny(permission, action, ...args) {
        return _(this.permissions).filter((p) => p.is(permission)).some((p) => p.can(action, ...args));
    }

    canAll(permission, action, ...args) {
        return _(this.permissions).filter((p) => p.is(permission)).every((p) => p.can(action, ...args));
    }

    merge(other) {
        if (this !== other && this.equals(other)) {
            for (let permission of other.permissions) {
                this.permissions.add(permission);
            }
        }
        return this;
    }

    equals(other) {
        return this === other || (other && this.name === other.name);
    }

}

module.exports = Role;