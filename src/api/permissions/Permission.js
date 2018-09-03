class Permission {
    constructor(component, action) {
        this.component = component;
        this.action = action;

        this.validate()
    }

    validate() {

    }

    is(component, action) {
        if (component && action) {
            return this.component.matches(component) && this.action.matches(action);
        }
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
        return this === other || (other && this.component === other.component && this.action === other.action);
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, ['sessions', 'channels']), true);
    }

}

module.exports = Permission;