const process = require('process');

class VersionMessage extends ctx('api.channels.message.AbstractMessage') {
    doValidate() {
    }

    doHandle() {
        return {
            version: process.env.npm_package_version || require('../../package.json').version,
            apiVersion: 1
        }
    }
}

module.exports = VersionMessage;