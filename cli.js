global._ = require('lodash');
global.utils = require('./lib/utils');
global.CronJob = require('cron').CronJob;
global.Debug = require('debug');
global.Random = require('seedrandom');

const rnd = new Random.xor4096(null, {global: true, entropy: true});

const Config = require('./cli/config');
const Mirkobot = require('./main');

// Prepare configuration module
let config = new Config({
    host: "0.0.0.0",
    port: "8080"
});

// Initialize application
let bot = new Mirkobot(config)
if (!bot.run()) {
    process.exit(1);
}

// User Input loop
;(function wait() {
   setTimeout(wait, 1000);
})();