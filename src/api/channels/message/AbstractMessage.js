class AbstractMessage {

    constructor(parent) {
        this.context = parent.context;
        this.valid = null;
        this.executed = false;
    }

    validate(msg) {
        if (_.isNil(this.valid)) {
            if (this.doValidate) {
                this.valid = false;
                let result = this.doValidate(msg);
                this.valid = _.isUndefined(result) || result === true;
            } else {
                this.valid = true;
            }
        }
        return this.valid;
    }

    handle(msg) {
        this.validate();
        if (!this.executed) {
            this.executed = true;
            if (this.doHandle) {
                this.executed = true;
                return this.doHandle();
            }
        }
    }

}

module.exports = AbstractMessage;