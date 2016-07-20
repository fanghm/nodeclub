var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var ObjectId  = Schema.ObjectId;

var ReplySchema = new Schema({
  content: { type: String },
  topic_id: { type: ObjectId},		// original post
  author_id: { type: ObjectId },
  reply_id: { type: ObjectId },		// the post it replies
  create_at: { type: Date, default: Date.now },
  update_at: { type: Date, default: Date.now },
  content_is_html: { type: Boolean },
  ups: [Schema.Types.ObjectId],		// guys who like this reply
  deleted: {type: Boolean, default: false},
});

ReplySchema.plugin(BaseModel);
ReplySchema.index({topic_id: 1});
ReplySchema.index({author_id: 1, create_at: -1});

mongoose.model('Reply', ReplySchema);
