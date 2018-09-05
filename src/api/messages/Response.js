class Response {
    constructor(request, result = false, data = null) {
        this.id = request.id;
        this.request = request;
        this.data = data;
        this.result = !!result;
        this.created = new Date();
    }
}

module.exports = Response;