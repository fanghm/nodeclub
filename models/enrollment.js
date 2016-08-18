var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var tools     = require('../common/tools');

var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var EnrollmentSchema = new Schema({
  activity_id: { type: ObjectId},
  author_id: { type: ObjectId },

  email: { type: String},
  contact: { type: String },  // 联系人及方法
  
  attendance: { type: Number, default: 1 },  // 报名人数
  price: { type: Number, default: 0 },	// price, for realtime freezing
  balance: { type: Number },	// current available balance before freezing

  options: { type: Schema.Types.Mixed}, // for custom fields as defined in activity.enroll_options

  create_at: { type: Date, default: Date.now },
  update_at: { type: Date, default: Date.now },	// allow update later

  content_is_html: { type: Boolean },  
  deleted: {type: Boolean, default: false},
});

EnrollmentSchema.plugin(BaseModel);
EnrollmentSchema.index({activity_id: 1});
EnrollmentSchema.index({author_id: 1, create_at: -1});

EnrollmentSchema.methods.format = function(date_field, friendly) {
  if (Object.getPrototypeOf(this).hasOwnProperty(date_field)) {
    return tools.formatDate(this[date_field], friendly);
  } else if (this.hasOwnProperty(date_field)) {
    return tools.formatDate(this[date_field], friendly);
  } else {
    return 'Long long ago...'; // :)
  }
}

mongoose.model('Enrollment', EnrollmentSchema);
