var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;
var config    = require('../config');
var _         = require('lodash');

var ActivitySchema = new Schema({
  author_id: { type: ObjectId },
  tab: {type: String},

  title: { type: String },    // 活动主题
  category: { type: String }, // 活动类型
  content: { type: String },  // 活动内容描述
  repeats: { type: Number, default: 1 },  // 期数, + repeat interval (weekly/monthly...)?
  total: { type: Number, default: 0 },    // 活动总人数限制
  limit: { type: Number, default: 1 },    // 每人报名人数限制, need?
  address: { type: String },  // 活动地点
  contact: { type: String },  // 联系人及方法

  need_pay: { type: Boolean, default: false }, // 是否俱乐部收费活动
  // 活动费用: <会员男>/<会员女>/<非会员男>/<非会员女>/<超过名额男>/<超过名额女> 
  fee_man: { type: Number, default: 0 },
  fee_woman: { type: Number, default: 0 },
  fee_man_nonmember: { type: Number, default: 0 },
  fee_woman_nonmember: { type: Number, default: 0 },
  fee_man_extra: { type: Number, default: 0 },
  fee_woman_extra: { type: Number, default: 0 },

  start_date: { type: Date},  // 活动开始时间
  end_date: { type: Date},    // 活动结束时间
  regret_date: { type: Date}, // 活动退票截止时间
  deadline: { type: Date},    // 活动报名截止时间
  
  comment: { type: String },  // 其他注意事项
  
  top: { type: Boolean, default: false },       // 置顶帖
  good: {type: Boolean, default: false},        // 精华帖
  ups: [Schema.Types.ObjectId],
  //lock: {type: Boolean, default: false},        // 被锁定主题 auto-lock after deadline?
  reply_count: { type: Number, default: 0 },
  visit_count: { type: Number, default: 0 },
  collect_count: { type: Number, default: 0 },  // 收藏 关注, ->follow?
  enroll_count: { type: Number, default: 0 },   // TODO: udpate

  create_at: { type: Date, default: Date.now },
  update_at: { type: Date, default: Date.now },
  
  content_is_html: { type: Boolean },
  deleted: {type: Boolean, default: false}, // status: locked(cannot reply), closed(only visible to owner/admin), deleted (only visible to admin), 
});

ActivitySchema.plugin(BaseModel);
ActivitySchema.index({create_at: -1});
ActivitySchema.index({top: -1, update_at: -1});
ActivitySchema.index({author_id: 1, create_at: -1});

ActivitySchema.virtual('tabName').get(function () {
  var tab  = this.tab;
  var pair = _.find(config.tabs, function (_pair) {
    return _pair[0] === tab;
  });

  if (pair) {
    return pair[1];
  } else {
    return '';
  }
});

// Save events to 'topics' collection as well 
// so that they can be displayed easily together with common posts
mongoose.model('Activity', ActivitySchema, 'topics');
