import mongoose from "mongoose";
import bcrypt from "bcrypt";

const starSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    idMovie: { type: String, required: true },
    star: { type: Number },
  },
  { timestamps: true }
);

const Star = mongoose.model("Star", starSchema);

export default Star;
