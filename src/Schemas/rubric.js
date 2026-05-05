import mongoose from "mongoose";
const { Schema } = mongoose;

export const criterionSchema = new Schema(
  {
    name: String,
    value: Number,
    description: String,
  },
  { _id: false },
);

export const rubricSchema = new Schema(
  {
    docentId: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    title: String,
    description: String,
    criterions: [criterionSchema],
  },
  {
    collection: "rubrics",
    versionKey: false,
  },
);
