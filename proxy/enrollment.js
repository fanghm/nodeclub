var models     = require('../models');
var Enrollment = models.Enrollment;
var EventProxy = require('eventproxy');
var tools      = require('../common/tools');
var User       = require('./user');
var at         = require('../common/at');

/**
 * 根据主题ID，获取回复列表
 * Callback:
 * - err, 数据库异常
 * - enrollments, 回复列表
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getEnrollmentsByActivityId = function (id, cb) {
  Enrollment.find({activity_id: id, deleted: false}, '', {sort: 'create_at'}, function (err, enrollments) {
    if (err) {
      return cb(err);
    }
    if (enrollments.length === 0) {
      return cb(null, []);
    }

    var proxy = new EventProxy();
    proxy.after('enrollment_find', enrollments.length, function () {
      cb(null, enrollments);
    });
    for (var j = 0; j < enrollments.length; j++) {
      (function (i) {
        var author_id = enrollments[i].author_id;
        User.getUserById(author_id, function (err, author) {
          if (err) {
            return cb(err);
          }
          enrollments[i].author = author || { _id: '' };
          if (enrollments[i].content_is_html) {
            return proxy.emit('enrollment_find');
          }
/*          at.linkUsers(enrollments[i].content, function (err, str) {
            if (err) {
              return cb(err);
            }
            enrollments[i].content = str;
            proxy.emit('enrollment_find');
          });*/
        });
      })(j);
    }
  });
};