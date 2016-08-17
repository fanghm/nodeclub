var models     = require('../models');
var Enrollment = models.Enrollment;
var EventProxy = require('eventproxy');
var tools      = require('../common/tools');
var User       = require('./user');
var at         = require('../common/at');

/**
 * 根据主题ID，获取Enrollment列表(including author whose mobile/email will be used as default contact method in enrolling)
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
    } else {
      //cb(null, enrollments);
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
          //if (enrollments[i].content_is_html) {
            return proxy.emit('enrollment_find');
          //}
          /*
          at.linkUsers(enrollments[i].content, function (err, str) {
            if (err) {
              return cb(err);
            }
            enrollments[i].content = str;
            proxy.emit('enrollment_find');
          });*/
        });
      }) (j);
    }//*/
  });
};

/**
 * 根据回复ID，获取回复
 * Callback:
 * - err, 数据库异常
 * - reply, 回复内容
 * @param {String} id 回复ID
 * @param {Function} callback 回调函数
 */
exports.getEnrollmentById = function (id, callback) {
  if (!id) {
    return callback(null, null);
  }
  Enrollment.findOne({_id: id}, function (err, reply) {
    if (err) {
      return callback(err);
    }
    if (!reply) {
      return callback(err, null);
    }

    var author_id = reply.author_id;
    User.getUserById(author_id, function (err, author) {
      if (err) {
        return callback(err);
      }
      reply.author = author;
      return callback(null, reply);
      
    });
  });
};

/**
 * 创建并保存一条enrollment
 * @param {models.Enrollment} [enrollment] enrollment
 * @param {Function} callback 回调函数
 */
exports.newAndSave = function (reply, callback) {
  reply.save(function (err) {
    callback(err, reply);
  });
};