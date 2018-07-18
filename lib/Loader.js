const debug = Debug('LOADER');
const path = require('path');
const utils = require('./utils');

class Loader {
    constructor(...paths) {
        this.classes = {};
        setTimeout(() => this.load.apply(this, paths), 0);
        return this.getOrLoad.bind(this);
    }

    load(...paths) {
        let loaded = [];
        for (let p of paths) {
            for (let filepath of utils.fs.findFiles(p)) {
                let parsed = path.parse(filepath);
                let name = path.join(path.relative(path.join(__dirname, '..'), parsed.dir), parsed.name).split(path.sep).join('.');

                if (this.has(name) === false) {
                    let instance = require(filepath);
                    loaded.push(name);
                    this.classes[name] = instance;
                }
            }
        }
        if (loaded && loaded.length) {  // debug print
            debug('Imported sources: %o', loaded);
        }
    }

    has(name) {
        return !!this.classes[name];
    }

    get(name) {
        return this.classes[name];
    }

    getOrLoad(name) {
        let filepath = (name || '').split('.').join(path.sep)
        if (filepath) {
            this.load(`${filepath}.js`)
        }
        return this.get(name)
    }
}

module.exports = Loader;