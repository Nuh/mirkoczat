class Response extends ctx('api.Observable') {
    constructor(request, result = false, data = null) {
        super();

        this.id = request.id;
        this.request = request;
        this.data = data;
        this.result = !!result;
        this.created = new Date();
    }
}

module.exports = Response;