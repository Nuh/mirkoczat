const fs = require('fs'),
    path = require('path');

let getModuleName = (filename) => path.basename(filename || '').replace(/\.js$/i, '');
let getAvailableModules = (_path) => {
    let normalizedPath = utils.fs.normalizePath(_path);
    try {
        return _(fs.readdirSync(normalizedPath)).values().flattenDeep().filter((filename) => ~filename.toLowerCase().indexOf('.js'))
                .map((filename) => _({name: getModuleName(filename), path: path.join(normalizedPath, filename), filename: filename}).value())
                .keyBy((n) => n.name).value();
    } catch (e) {
        // ignore
    }
    return [];
}

let utils = {
    fs: {
        normalizePath: (_path) => {
            return path.normalize((path.isAbsolute(_path) ? _path : path.join(__dirname, '../', _path)) || '.');
        },
        findFiles: (_path) => {
            let dir = utils.fs.normalizePath(_path);
            if (!fs.existsSync(dir)) {
                return [];
            }

            let files = [];
            let dirStat = fs.statSync(dir);
            if (dirStat.isFile()) {
                return [dir];
            } else if (dirStat.isDirectory) {
                let foundFiles = fs.readdirSync(dir);
                for (let name of foundFiles) {
                    let filepath = path.join(dir, name)
                    if (!fs.existsSync(filepath)) {
                        continue;
                    }

                    let stat = fs.statSync(filepath)
                    if (stat.isDirectory()) {
                       files = [...files, ...utils.fs.findFiles(filepath)]
                    } else if (stat.isFile()) {
                       files.push(filepath)
                    }
                }
            }
            return files
        }
    },
    proxy: {
      event: (source, target, ...events) => {
        _([...events]).flattenDeep().each((e) => source.on(e, (...args) => target.emit(e, ...args)));
      }
    },
    modules: {
        find: getAvailableModules
    }
}

module.exports = utils;