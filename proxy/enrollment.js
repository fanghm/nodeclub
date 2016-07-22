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
    } else {
      cb(null, enrollments);
    }
/*
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
          at.linkUsers(enrollments[i].content, function (err, str) {
            if (err) {
              return cb(err);
            }
            enrollments[i].content = str;
            proxy.emit('enrollment_find');
          });
        });
      }) (j);
    }*/
  });
};

/**
 * 创建并保存一条回复信息
 * @param {String} content 回复内容
 * @param {String} topicId 主题ID
 * @param {String} authorId 回复作者
 * @param {String} [replyId] 回复ID，当二级回复时设定该值
 * @param {Function} callback 回调函数
 */
exports.newAndSave = function (option, contact, balance, fee, topicId, authorId, callback) {

  var reply     = new Enrollment();
  reply.option  = option;
  reply.contact = contact;
  reply.balance = balance;
  reply.fee     = fee;
  
  reply.activity_id  = topicId;
  reply.author_id = authorId;


  reply.save(function (err) {
    callback(err, reply);
  });
};