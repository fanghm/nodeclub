/*!
 * nodeclub - controllers/activity.js
 */

/**
 * Module dependencies.
 */

var validator = require('validator');

var at           = require('../common/at');
var User         = require('../proxy').User;
var Topic        = require('../proxy').Topic;
var Activity     = require('../proxy').Activity;
var ActivityModel= require('../models').Activity; // TODO: use proxy only later
var TopicCollect = require('../proxy').TopicCollect;
var EventProxy   = require('eventproxy');
var tools        = require('../common/tools');
var store        = require('../common/store');
var config       = require('../config');
var _            = require('lodash');
var cache        = require('../common/cache');
var logger = require('../common/logger');

function validateRequest(req) {
  // because there're too many activity attributes, 
  // get them from req.body in a loop 
  var act = new ActivityModel();  // note: _id is a new one
  for (var prop in act) {
    if (req.body.hasOwnProperty(prop)) {
      //console.log("updated prop:" + prop);
      if (typeof req.body[prop] === 'string') {
        act[prop] = validator.trim(req.body[prop]);
      } else {
        act[prop] = req.body[prop];
      }
    }
  }

  act.content   = validator.trim(req.body.t_content);
  act.author_id = req.session.user._id;

  if (act.need_pay) {
    var fees = req.body.expense.split("/");
    if (fees.length !== 6) {
      editError = '费用格式wrong';
    } else {
      act.fee_man              = parseInt(fees[0]);
      act.fee_woman            = parseInt(fees[1]);
      act.fee_man_nonmember    = parseInt(fees[2]);
      act.fee_woman_nonmember  = parseInt(fees[3]);
      act.fee_man_extra        = parseInt(fees[4]);
      act.fee_woman_extra      = parseInt(fees[5]);
    }
  }

  // 验证
  var editError;
  if (act.title === '') {
    editError = '标题不能是空的。';
  } else if (act.title.length < 5 || act.title.length > 100) {
    editError = '标题字数太多或太少。';
  } else if (!act.tab || Object.keys(config.tabs).indexOf(act.tab) === -1) {
    editError = '必须选择一个版块。';
  } else if (act.content === '') {
    editError = '活动内容不可为空';
  } else if (act.address === '') {
    editError = '活动地点不可为空';
  } else if (act.contact === '') {
    editError = '联系人及方法不可为空';
  } else if (act.start_date === '' || act.end_date === '' || act.regret_date === '' || act.deadline === '' ) {
    editError = 'All时间不可为空';
  } else if (act.end_date < act.start_date) {
    editError = '活动结束时间不可<开始时间';
  }
  // END 验证

  var data = {act: act};

  if (typeof editError !== 'undefined') {
    data.edit_error = editError;
  }
  
  //console.log("validateRequest:" + JSON.stringify(data));
  return data;
}

exports.create = function (req, res, next) {
  res.render('activity/edit', {
    //tabs: config.tabs
  });
};

exports.put = function (req, res, next) {
  var data = validateRequest(req);
  var act = data.act;

  if (data.hasOwnProperty('edit_error')) {
    act.edit_error = data.edit_error;
    //act.tabs = config.tabs;
    res.status(422);
    return res.render('activity/edit', act);
  }  
  
  act.save(function (err, activity) {
    if (err) {
      return next(err);
    }

    var proxy = new EventProxy();

    proxy.all('score_saved', function () {
      res.redirect('/activity/' + activity._id);
    });
    proxy.fail(next);
    User.getUserById(req.session.user._id, proxy.done(function (user) {
      user.score += 5;
      user.topic_count += 1;
      user.save();
      req.session.user = user;
      proxy.emit('score_saved');
    }));

    //发送at消息
    //at.sendMessageToMentionUsers(act.content, activity._id, req.session.user._id);
  });
};

/**
 * Activity page: include at least: activity, replies, enrollments; user balance, user info(nokia id...)
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 * @param  {Function} next
 */
exports.index = function (req, res, next) {
  function isUped(user, reply) {
    if (!reply.ups) {
      return false;
    }
    return reply.ups.indexOf(user._id) !== -1;
  }

  var activity_id = req.params.aid;
  var currentUser = req.session.user;

  if (activity_id.length !== 24) {
    return res.render404('此活动不存在或已被删除。');
  }

  var events = ['activity', 'is_collect'];
  var ep = EventProxy.create(events,
    function (activity, is_collect) { // /*other_activities, no_reply_activities,*/ 
    res.render('activity/index', {
      topic: activity,
      //author_other_topics: other_activities,
      //no_reply_topics: no_reply_activities,
      is_uped: isUped,
      is_collect: is_collect,
    });
  });

  ep.fail(next);

  Activity.getFullActivity(activity_id, ep.done(function (message, activity, author, replies, enrollments) {
    if (message) {
      logger.error('getFullActivity error activity_id: ' + activity_id)
      return res.renderError(message);
    }

    activity.visit_count += 1;
    activity.save();

    activity.author  = author;
    activity.replies = replies;
    activity.enrollments = enrollments;
    activity.reply_up_threshold = 1;
    /*/ 点赞数排名第三的回答，它的点赞数就是阈值, only used in view
    activity.reply_up_threshold = (function () {
      var allUpCount = replies.map(function (reply) {
        return reply.ups && reply.ups.length || 0;
      });
      allUpCount = _.sortBy(allUpCount, Number).reverse();

      var threshold = allUpCount[2] || 0;
      if (threshold < 3) {
        threshold = 3;
      }
      return threshold;
    })();*/

/*  
    // for debugging  
    var options = activity.options.trim();
    console.log("activity.options:" + options);
    if (options !== "") {
      try {
        var obj = JSON.parse(options);
        obj.forEach( function(option) {
          console.log(JSON.stringify(option));
        });

      } catch (ex) {
        console.error("Exception in parsing options:" + ex.message
          + "\nQuotation marks around field/values cannot be omitted.");
      }
    }*/

    ep.emit('activity', activity);

    /*/ get other_activitys
    var options = { limit: 5, sort: '-last_reply_at'};
    var query = { author_id: activity.author_id, _id: { '$nin': [ activity._id ] } };
    Activity.getActivitysByQuery(query, options, ep.done('other_activitys'));

    // get no_reply_activitys
    cache.get('no_reply_activitys', ep.done(function (no_reply_activitys) {
      if (no_reply_activitys) {
        ep.emit('no_reply_activitys', no_reply_activitys);
      } else {
        Activity.getActivitysByQuery(
          { reply_count: 0, tab: {$ne: 'job'}},
          { limit: 5, sort: '-create_at'},
          ep.done('no_reply_activitys', function (no_reply_activitys) {
            cache.set('no_reply_activitys', no_reply_activitys, 60 * 1);
            return no_reply_activitys;
          }));
      }
    }));*/
  }));

  if (!currentUser) {
    ep.emit('is_collect', null);
  } else {
    TopicCollect.getTopicCollect(currentUser._id, activity_id, ep.done('is_collect'));
  }
};

exports.showEdit = function (req, res, next) {
  var activity_id = req.params.aid;

  Activity.getActivityById(activity_id, function (err, topic, tags) {
    if (!topic) {
      res.render404('此活动不存在或已被删除。');
      return;
    }

    if (String(topic.author_id) === String(req.session.user._id) || req.session.user.is_admin) {
      var data = JSON.parse(JSON.stringify(topic)); // obj copy
      data.action = 'edit';
      data.activity_id = activity_id;
      //data.tabs = config.tabs;
      res.render('activity/edit', data);
    } else {
      res.renderError('对不起，你不能编辑此活动。', 403);
    }
  });
};

exports.update = function (req, res, next) {
  var data = validateRequest(req);
  var act = JSON.parse(JSON.stringify(data.act));
  delete act._id;
  //console.log("data.act: " + JSON.stringify(act));

  Activity.getActivityById(req.params.aid, function (err, topic, author) {
    if (!topic) {
      res.render404('此活动不存在或已被删除。');
      return;
    }

    if (topic.author_id.equals(req.session.user._id) || req.session.user.is_admin) {
      if (data.hasOwnProperty('edit_error')) {
        act.action = 'edit';
        act.edit_error = data.edit_error;
        act.activity_id = req.params.aid;
        return res.render('activity/edit', act);
      }

      //保存活动changes from req.body
      for (var prop in act) {
        topic[prop] = act[prop];
      }

      topic.update_at = new Date();
      //console.log("Updated activity: " + JSON.stringify(topic));

      topic.save(function (err) {
        if (err) {
          return next(err);
        }

        res.redirect('/activity/' + req.params.aid);
      });
    } else {
      res.renderError('对不起，你不能编辑此活动。', 403);
    }
  });
};

exports.enroll = function (req, res, next) {

};

exports.getEnrollment = function (req, res, next) {

};

exports.list = function (req, res, next) {

};

