import mongoose from "mongoose";
import bcrypt from "bcrypt";

const filmMakerSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  companyName: { type: String, required: false },
  location:{type:String,required:false},
  birthday: { type: String, required: false },
  password: { type: String, required: false },
  isMaker: { type: Boolean, default: true },
  confirmationCode: {
    type: String,
    default: null,
  },

  avatar: { type: String, default: null },
});

filmMakerSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const FilmMaker = mongoose.model("FilmMaker", filmMakerSchema);

export default FilmMaker;
