class Permission {
    constructor(name) {
        this.name = name;
        this.validate()
    }

    validate() {

    }

    is(name) {
        if (name) {
            return this.name.matches(name);
        }
        return false;
    }

    merge(other) {
        if (this !== other && this.equals(other)) {
            // for (let session of other.sessions) {
            //     this.sessions.add(session);
            // }
            //
            // this.sex = other.sex;
        }
        return this;
    }

    equals(other) {
        return this === other || (other && this.name === other.name);
    }

    toResponse() {
        return utils.convert.toResponse(_.omit(this, []), true);
    }

}

module.exports = Permission;