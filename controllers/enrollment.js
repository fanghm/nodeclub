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
  var option  = req.body.option;
  var contact = req.body.contact;
  var balance = req.body.balance;
  var topic_id = req.params.aid;
  console.log("option: " + option + ", topic_id: " + topic_id);

  var str = validator.trim(String(option));
  if (str === '') {
    return res.renderError('回复option内容不能为空!', 422);
  }

  str = validator.trim(String(contact));
  if (str === '') {
    return res.renderError('回复contact内容不能为空!', 422);
  }

  var ep = EventProxy.create();
  ep.fail(next);

  console.log("0");
  Activity.getActivity(topic_id, ep.done(function (topic) { // doneLater
    console.log("1.0");
    if (!topic) {
      ep.unbind();
      // just 404 page
      return next();
    }

    if (Date.now() > topic.deadline) {
      //return res.renderError('此activity已 pass deadline, 锁定!', 422); // TODO: enable this line after testing
    }
    ep.emit('topic', topic);
    console.log("1.9");
  }));

  ep.all('topic', function (topic) {
    console.log("2.0");
    User.getUserById(topic.author_id, ep.done('topic_author'));
    console.log("2.9");
  });

  ep.all('topic', 'topic_author', function (topic, topicAuthor) { //name????
    console.log("3.0");
    Enrollment.newAndSave(option, contact, balance, 0, topic_id, req.session.user._id, ep.done(function (reply) {
      //Activity.updateLastReply(topic_id, reply._id, ep.done(function () {
        ep.emit('reply_saved', reply);
      //}));
    }));
    console.log("3.5");
    User.getUserById(req.session.user._id, ep.done(function (user) {
      user.score += 5;
      user.enroll_count += 1;
      user.save();
      req.session.user = user;
      ep.emit('score_saved');
    }));
    console.log("3.9");
  });

  // ep.all('reply_saved', 'topic', function (reply, topic) {
  //   if (topic.author_id.toString() !== req.session.user._id.toString()) {
  //     message.sendReplyMessage(topic.author_id, req.session.user._id, topic._id, reply._id);
  //   }
  //   ep.emit('message_saved');
  // });
  console.log("4.0");
  ep.all('reply_saved', 'score_saved', function (reply) {
    console.log("reply._id: " + reply._id);
    res.redirect('/activity/' + topic_id + '#' + reply._id);
  });
  console.log("4.9");
};