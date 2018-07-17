class WykopAuthorization extends ctx('api.user.Authorization') {

    constructor(socket, data) {
        super(socket, data.login, data.sex);
        this.data = data;
    }

}

module.exports = WykopAuthorization;