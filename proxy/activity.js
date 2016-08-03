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
console.log("getFullActivity0:" + Date.now());
      callback(null, '', topic, author, replies, enrollments);
console.log("getFullActivity1:" + Date.now());
    })
    .fail(callback);

console.log("getFullActivity2:" + Date.now());
  Activity.findOne({_id: id, deleted: false}, proxy.done(function (topic) {
    if (!topic) {
      proxy.unbind();
      return callback(null, '此activity不存在或已被删除。');
    }
console.log("getFullActivity3:" + Date.now());
    proxy.emit('topic', topic);
    // at.linkUsers(topic.content, proxy.done('topic', function (str) {
    //   topic.linkedContent = str;  // TODO: not used
    //   return topic;
    // }));

console.log("getFullActivity4:" + Date.now());
    User.getUserById(topic.author_id, proxy.done(function (author) {
      if (!author) {
        proxy.unbind();
        return callback(null, 'Activity的作者丢了。');
      }
console.log("getFullActivity5:" + Date.now());
      proxy.emit('author', author);
    }));

console.log("getFullActivity6:" + Date.now());
    Reply.getRepliesByTopicId(topic._id, proxy.done('replies'));

console.log("getFullActivity7:" + Date.now());
    Enrollment.getEnrollmentsByActivityId(topic._id, proxy.done('enrollments'));
console.log("getFullActivity8:" + Date.now());
  }));
};

/**
 * 根据主题ID，查找一条主题
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getActivity = function (id, callback) {
  Activity.findOne({_id: id}, callback);
};

/**
 * 根据Activity ID获取Activity
 * Callback:
 * - err, 数据库错误
 * - topic, 主题
 * - author, 作者
 * - lastReply, 最后回复
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getActivityById = function (id, callback) {
  var proxy = new EventProxy();
  var events = ['topic', 'author'];
  proxy.assign(events, function (topic, author, last_reply) {
    if (!author) {
      return callback(null, null, null, null);
    }
    return callback(null, topic, author, last_reply);
  }).fail(callback);

  Activity.findOne({_id: id}, proxy.done(function (topic) {
    if (!topic) {
      proxy.emit('topic', null);
      proxy.emit('author', null);
      proxy.emit('last_reply', null);
      return;
    }
    proxy.emit('topic', topic);

    User.getUserById(topic.author_id, proxy.done('author'));

/*    if (topic.last_reply) {
      Reply.getReplyById(topic.last_reply, proxy.done(function (last_reply) {
        proxy.emit('last_reply', last_reply);
      }));
    } else {
      proxy.emit('last_reply', null);
    }*/
  }));
};

/**
 * 将当前主题的回复计数减1，并且更新最后回复的用户，删除回复enrollment时用到
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.reduceCount = function (id, callback) {
  Activity.findOne({_id: id}, function (err, topic) {
    if (err) {
      return callback(err);
    }

    if (!topic) {
      return callback(new Error('该Activity不存在'));
    }

    topic.enroll_count -= 1;
    topic.save(callback);
  });
};