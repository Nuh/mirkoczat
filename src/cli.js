global._ = require('lodash');
global.CronJob = require('cron').CronJob;
global.Debug = require('debug');
global.Random = require('seedrandom');

import Config from './api/config'

// const rnd = new Random.xor4096(null, {global: true, entropy: true});
//
// const Mirkoczat = require('./main');

// Prepare configuration module
let config = new Config({ddd: 'tre'});
console.log(config);

// Initialize application
// let bot = new Mirkoczat(config)
// if (!bot.run()) {
//     process.exit(1);
// }
//
// // User Input loop
// ;(function wait() {
//    setTimeout(wait, 1000);
// })();