var validator  = require('validator');
var _          = require('lodash');
var at         = require('../common/at');
var message    = require('../common/message');
var EventProxy = require('eventproxy');
var User       = require('../proxy').User;
var Topic      = require('../proxy').Topic;
var Reply      = require('../proxy').Reply;
var Activity   = require('../proxy').Activity;
var Enrollment = require('../proxy').Enrollment;
var config     = require('../config');

/**
 * 添加回复
 */
exports.add = function (req, res, next) {
  var email  = req.body.email;
  var option  = req.body.option;
  var contact = req.body.contact;
  var balance = req.body.balance;
  var topic_id = req.params.aid;

  var str = validator.trim(String(option));
  if (str === '') {
    return res.renderError('回复option内容不能为空!', 422);
  }

  str = validator.trim(String(email));
  if (str === '') {
    return res.renderError('回复email内容不能为空!', 422);
  }

  str = validator.trim(String(contact));
  if (str === '') {
    return res.renderError('回复contact内容不能为空!', 422);
  }

  var ep = EventProxy.create();
  ep.fail(next);

  Activity.getActivity(topic_id, ep.done(function (topic) { // doneLater
    if (!topic) {
      ep.unbind();
      // just 404 page
      return next();
    }

    if (Date.now() > topic.deadline) {
      //return res.renderError('此activity已 pass deadline, 锁定!', 422); // TODO: enable this line after testing
    }
    ep.emit('topic', topic);
  }));

  ep.all('topic', function (topic) {
    User.getUserById(topic.author_id, ep.done('topic_author'));
  });

  ep.all('topic', 'topic_author', function (topic, topicAuthor) {
    var enrollment = new require('../models').Enrollment();
    var options = {};

    console.log("req.body: " + JSON.stringify(req.body) );

    for(var prop in req.body) {
      if (Object.getPrototypeOf(enrollment).hasOwnProperty(prop)) {
        enrollment[prop] = req.body[prop];
      } else if (prop.substr(0, 7) === "option_" && req.body[prop].trim() !== "") {
        options[prop] = req.body[prop].trim();
      }
    }

    if (req.body.hasOwnProperty('public_fields')) {
      options['public_fields'] = req.body.public_fields.trim().split('|');
    }

    console.log("Custom options: " + JSON.stringify(options));

    enrollment.options = options;
    enrollment.activity_id  = topic_id;
    enrollment.author_id = req.session.user._id;
    console.log("New enrollment: " + JSON.stringify(enrollment));

    Enrollment.newAndSave(enrollment, ep.done(function (reply) {
      //Activity.updateLastReply(topic_id, reply._id, ep.done(function () {
        ep.emit('reply_saved', reply);
      //}));
    }));

    User.getUserById(req.session.user._id, ep.done(function (user) {
      user.score += 5;
      user.enroll_count += 1;
      user.save();
      req.session.user = user;
      ep.emit('score_saved');
    }));
  });

  // ep.all('reply_saved', 'topic', function (reply, topic) {
  //   if (topic.author_id.toString() !== req.session.user._id.toString()) {
  //     message.sendReplyMessage(topic.author_id, req.session.user._id, topic._id, reply._id);
  //   }
  //   ep.emit('message_saved');
  // });

  ep.all('reply_saved', 'score_saved', function (reply) {
    res.redirect('/activity/' + topic_id + '#' + reply._id);
  });
};

/**
 * 删除回复信息
 */
exports.delete = function (req, res, next) {
  var reply_id = req.body.reply_id;
  Enrollment.getEnrollmentById(reply_id, function (err, reply) {
    if (err) {
      return next(err);
    }

    if (!reply) {
      res.status(422);
      res.json({status: 'no enrollment ' + reply_id + ' exists'});
      return;
    }

    // only author and admin can delete
    if (reply.author_id.toString() === req.session.user._id.toString() || req.session.user.is_admin) {
      reply.deleted = true;
      reply.save();
      res.json({status: 'success'});

      reply.author.score -= 5;
      reply.author.enroll_count -= 1;
      reply.author.save();
    } else {
      res.json({status: 'failed'});
      return;
    }

    Activity.reduceCount(reply.activity_id, _.noop);
  });
};