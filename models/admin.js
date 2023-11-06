import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true },
  isAdmin: { type: Boolean, default: true },
  password: { type: String, required: true },
  confirmationCode: {
    type: String,
    default: null,
  },
});

adminSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
