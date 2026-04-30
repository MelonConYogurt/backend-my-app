import mongoose, { mongo } from "mongoose";
const { Schema } = mongoose;

export const deliverableSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    docentId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    status: {
      type: String,
      enum: ["pendiente", "entregado", "completado", "rechazado"],
      default: "pendiente",
    },

    file: {
      type: Schema.Types.ObjectId,
      ref: "documents.files",
    },
    rating: {
      type: Number,
    },
  },
  {
    collection: "deliverables",
    timestamps: true,
    versionKey: false,
  },
);
