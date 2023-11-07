import mongoose from "mongoose";
import bcrypt from "bcrypt";

const voucherSchema = new mongoose.Schema({
  detail:{type:Object,default:null},
  voucher: { type: String, default: null },
});


const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
