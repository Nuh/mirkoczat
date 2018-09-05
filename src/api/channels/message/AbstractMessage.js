class AbstractMessage {

    constructor(parent) {
        this.context = parent.context;
    }

    prepare() {
        this.channels = this.context.getModule('channels');
    }

    validate(msg) {
        if (this.doValidate instanceof Function) {
            let result = this.doValidate(msg);
            return _.isUndefined(result) || result === true;
        }
        return true;
    }

    handle(msg) {
        if (this.doHandle instanceof Function) {
            return this.doHandle(msg);
        }
    }

}

module.exports = AbstractMessage;