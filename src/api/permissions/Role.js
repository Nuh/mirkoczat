class Role extends ctx('api.Observable') {
    constructor(name, ...permissions) {
        this.name = name;
        this.permissions = _(permissions)
                            .castArray()
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

    hasPermission(component, action) {
        return !!_(this.permissions).find((p) => p.is(component, action));
    }

    getPermissions(component, action) {
        if (_.isUndefined(component) && _.isUndefined(action)) {
            return [...this.permissions]
        }
    }

    can(component, action, ...args) {
        return this.canAny(component, action, ...args);
    }

    canAny(component, action, ...args) {
        return _(this.permissions).filter((p) => p.is(component, action)).some((p) => p.can(...args));
    }

    canAll(component, action, ...args) {
        return _(this.permissions).filter((p) => p.is(component, action)).every((p) => p.can(...args));
    }

    isAutomaticApplicable(...args) {
        return false;
    }

    merge(other) {
        if (this !== other && this.equals(other)) {
            for (let session of other.sessions) {
                this.sessions.add(session);
            }

            this.sex = other.sex;
        }
        return this;
    }

    equals(other) {
        return this === other || (other && this.name === other.name);
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['sessions', 'channels']), true);
    }

}

module.exports = Role;