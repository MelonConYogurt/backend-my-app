import mongoose from "mongoose";

const { Schema } = mongoose;

export const userSchema = new Schema({
  name: String,
  email: String,
  password: String,
  active: Boolean,
  rol: String,
  CreatedAt: { type: Date, default: Date.now },
});
