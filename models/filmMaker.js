import mongoose from "mongoose";
import bcrypt from "bcrypt";

const filmMakerSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  confirmationCode: {
    type: String,
    default: null,
  },
  avatar: { type: String, default: null },
  rank: { type: Number, default: 0 },
});

filmMakerSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const FilmMaker = mongoose.model("FilmMaker", filmMakerSchema);

export default FilmMaker;
