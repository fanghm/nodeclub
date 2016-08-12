var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var EnrollmentSchema = new Schema({
  activity_id: { type: ObjectId},
  author_id: { type: ObjectId },

  email: { type: String},
  mobile: { type: String},
  contact: { type: String },  // 联系人及方法
  attendance: { type: Number, default: 1 },  // 报名人数
  options: { type: Schema.Types.Mixed}, // for custom option fields
  
  price: { type: Number, default: 0 },	// for freezing
  balance: { type: Number },	// current available balance before freezing

  create_at: { type: Date, default: Date.now },
  update_at: { type: Date, default: Date.now },	// allow update later

  content_is_html: { type: Boolean },  
  deleted: {type: Boolean, default: false},
});

EnrollmentSchema.plugin(BaseModel);
EnrollmentSchema.index({activity_id: 1});
EnrollmentSchema.index({author_id: 1, create_at: -1});

mongoose.model('Enrollment', EnrollmentSchema);
