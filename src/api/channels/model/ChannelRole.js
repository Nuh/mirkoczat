class ChannelRole extends ctx('api.permissions.Role') {

    constructor(name, ...permissions) {
        super(name, ...permissions);
    }

}
module.exports = ChannelRole;