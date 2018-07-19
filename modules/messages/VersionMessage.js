const process = require('process');

class VersionMessage {
    handle() {
        return process.env.npm_package_version || require('../../package.json').version
    }
}

module.exports = VersionMessage;