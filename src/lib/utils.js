const fs = require('fs'),
    path = require('path');

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
                    let filepath = path.join(dir, name);
                    if (!fs.existsSync(filepath)) {
                        continue;
                    }

                    let stat = fs.statSync(filepath);
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
    modules: {
        getName: (filename) =>  path.parse(filename || '').name,
        find: (_path) => {
            let normalizedPath = utils.fs.normalizePath(_path);
            try {
                return _(fs.readdirSync(normalizedPath)).values().flattenDeep().filter((filename) => ~filename.toLowerCase().indexOf('.js'))
                    .map((filename) => _({name: utils.modules.getName(filename), path: path.join(normalizedPath, filename), filename: filename}).value())
                    .keyBy((n) => n.name).value();
            } catch (e) {
                // ignore
            }
            return [];
        }
    },
    proxy: {
        event: (source, target, ...events) => {
            return _([...events]).flattenDeep().each((e) => source.on(e, (...args) => target.emit(e, ...args)));
        },
        eventWith: (source, target, e, interceptor) => {

            return source.on(e, (...args) => target.emit(e, ...interceptor(args)));
        }
    },
    convert: {
        toResponse: (obj, force = false) => {
            if (_.isNil(obj)) {
                return;
            } else if (obj instanceof Function) {
                return;
            } else if (typeof obj === 'number' || obj instanceof Number) {
                return +obj;
            } else if (typeof obj === 'string' || obj instanceof String) {
                return obj.toString();
            } else if (obj instanceof Symbol) {
                return obj.valueOf();
            } else if (obj instanceof Date) {
                return obj.getTime();
            } else if (obj[Symbol.iterator] instanceof Function) {
                return _.map([...obj], _.ary(utils.convert.toResponse, 1));
            } else if (obj instanceof Object || obj instanceof Map) {
                if (obj.constructor instanceof Function && obj.constructor instanceof Object) {
                    if (!force && obj.toResponse instanceof Function) {
                        return obj.toResponse();
                    }
                } else if (obj instanceof Map) {
                    obj = Array.from(obj.entries()).reduce((main, [key, value]) => ({...main, [key]: value}), {});
                }
                return _(obj)
                    .omitBy((v, k) => {
                        return (k || '').toString().match(/^(_|$|event$|delimiter$|verboseMemoryLeak$|debug$)/)
                    })
                    .mapValues(_.ary(utils.convert.toResponse, 1));
            }
            return obj;
        }
    },
    extract: {
        username: (user) => user.user && user.user.username ? user.user.username : (user && user.username ? user.username : (user || 'SYSTEM'))
    }
};

module.exports = utils;