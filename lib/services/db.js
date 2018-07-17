const lodashId = require('lodash-id');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const db = low(new FileSync('db.json'));
db._.mixin(lodashId);

module.exports = db;