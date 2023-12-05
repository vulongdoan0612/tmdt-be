import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
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
  voucher: { type: String, default: 'vip0' },
  favMovie:[{type:Object}],
  historyBuy: [
    {
      date: { type: Date, default: Date.now },
      typeOfVoucher: { type: String },
    },
  ],
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
