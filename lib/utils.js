const fs = require('fs');
const path = require('path');

let getNormalizePath = (_path) => path.normalize((path.isAbsolute(_path) ? _path : path.join(__dirname, '../', _path)) || '.');
let getModuleName = (filename) => path.basename(filename || '').replace(/\.js$/i, '');

let getAvailableModules = (_path) => {
    let normalizedPath = getNormalizePath(_path);
    try {
        return _(fs.readdirSync(normalizedPath)).values().flattenDeep().filter((filename) => ~filename.toLowerCase().indexOf('.js'))
                .map((filename) => _({name: getModuleName(filename), path: path.join(normalizedPath, filename), filename: filename}).value())
                .keyBy((n) => n.name).value();
    } catch (e) {
        // ignore
    }
    return [];
}

module.exports = {
    normalize: {
        path: getNormalizePath
    },
    modules: {
        find: getAvailableModules
    }
}