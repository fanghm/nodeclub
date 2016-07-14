var EventProxy = require('eventproxy');
var models     = require('../models');
var Activity   = models.Activity;
// var User       = require('./user');
// var Reply      = require('./reply');
// var tools      = require('../common/tools');
// var at         = require('../common/at');
// var _          = require('lodash');


exports.newAndSave = function (activity, callback) {
  activity.save(callback);
};
