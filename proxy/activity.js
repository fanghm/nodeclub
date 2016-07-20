var EventProxy = require('eventproxy');
var models     = require('../models');
var Activity   = models.Activity;
var User       = require('./user');
var Reply      = require('./reply');
var Enrollment = require('./enrollment');
// var tools      = require('../common/tools');
var at         = require('../common/at');
// var _          = require('lodash');


// exports.newAndSave = function (activity, callback) {
//   activity.save(callback);
// };

/**
 * 获取所有信息的主题
 * Callback:
 * - err, 数据库异常
 * - message, 消息
 * - topic, 主题
 * - author, 主题作者
 * - replies, 主题的回复
 * - enrollments, activity enrollments
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getFullActivity = function (id, callback) {
  var proxy = new EventProxy();
  var events = ['topic', 'author', 'replies', 'enrollments'];
  proxy
    .assign(events, function (topic, author, replies, enrollments) {
      callback(null, '', topic, author, replies, enrollments);
    })
    .fail(callback);

  Activity.findOne({_id: id, deleted: false}, proxy.done(function (topic) {
    if (!topic) {
      proxy.unbind();
      return callback(null, '此activity不存在或已被删除。');
    }
    at.linkUsers(topic.content, proxy.done('topic', function (str) {
      topic.linkedContent = str;
      return topic;
    }));

    User.getUserById(topic.author_id, proxy.done(function (author) {
      if (!author) {
        proxy.unbind();
        return callback(null, 'Activity的作者丢了。');
      }
      proxy.emit('author', author);
    }));

    Reply.getRepliesByTopicId(topic._id, proxy.done('replies'));

    Enrollment.getEnrollmentsByActivityId(topic._id, proxy.done('enrollments'));
  }));
};