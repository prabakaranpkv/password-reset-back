import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileNo: {
    type: Number,
    required: true,
  },
  confirm: {
    type: Boolean,
    default: false,
  },
  resetToken: {
    type: String,
  },
  expiryTime: {
    type: String,
  },
});

export const Users = mongoose.model("user", userSchema);
