import mongoose, { mongo } from "mongoose";
const { Schema } = mongoose;

export const fileSchema = new mongoose.Schema(
  {
    length: Number,
    chunkSize: Number,
    uploadDate: Date,
    filename: String,

    metadata: {
      mimetype: String,
      size: Number,
    },
  },
  {
    collection: "documents.files",
    versionKey: false,
  },
);
