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
    rubricId: {
      type: Schema.Types.ObjectId,
      ref: "rubric",
    },
    rating: {
      type: Number,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    comments: [
      {
        authorId: {
          type: Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        role: {
          type: String,
          enum: ["student", "docent"],
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    collection: "deliverables",
    timestamps: true,
    versionKey: false,
  },
);
