const Promise = require('bluebird');
const RequestPromise = require('request-promise');

const cheerio = require('cheerio');

let uploadHtml = function(html) {
    if(!html) {
        return Promise.reject();
    }

    return RequestPromise({ method: 'POST', uri: 'https://pste.eu/', form: { 'html-text': html }, insecure: true })
        .then(function(body) {
            var $ = cheerio.load(body)
            var url = $('a').attr('href')
            return url ? Promise.resolve(url) : Promise.reject()
        });
};

module.exports = {
    uploadHtml: uploadHtml
}