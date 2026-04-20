import mongoose from "mongoose";

const { Schema } = mongoose;

export const userSchema = new Schema({
  name: String,
  email: String,
  password: String,
  active: Boolean,
  role: String,
  CreatedAt: { type: Date, default: Date.now },
});
