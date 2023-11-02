import mongoose from "mongoose";
import bcrypt from "bcrypt";

const moviesSchema = new mongoose.Schema({
  author: { type: String, required: true },
  email: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  movies: { type: String },
  thumbnails: { type: String },
  movieName: { type: String },
  author: { type: String },

  actor: { type: Object },
  dateRelease: { type: String },
});

moviesSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const Movies = mongoose.model("Movies", moviesSchema);

export default Movies;
