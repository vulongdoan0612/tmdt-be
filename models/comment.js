import mongoose from "mongoose";
import bcrypt from "bcrypt";

const commentsSchema = new mongoose.Schema(
    {
      avatar:{type:String,require:true},
    username: { type: String, required: true },
    idMovie: { type: String, required: true },
    comment: { type: String },
  },
  { timestamps: true }
);

commentsSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const Comment = mongoose.model("Comment", commentsSchema);

export default Comment;
