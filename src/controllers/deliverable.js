import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { deliverableSchema } from "../Schemas/deliverable.js";
import { userSchema } from "../Schemas/user.js";

const Deliverable = mongoose.model("deliverable", deliverableSchema);
const User = mongoose.model("user", userSchema);
const DeliverableRouter = express.Router();

// Configurar multer para almacenar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo ciertos tipos de archivo
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "application/zip",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
});

// Obtener todos los entregables de un docente
DeliverableRouter.get("/docent/:docentId", async (req, res) => {
  try {
    const { docentId } = req.params;

    const deliverables = await Deliverable.find({ docentId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Entregables obtenidos correctamente",
      data: deliverables,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener entregables",
      error: error.message,
    });
  }
});

// Obtener todos los entregables de un estudiante
DeliverableRouter.get("/student/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const deliverables = await Deliverable.find({ userId })
      .populate("docentId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Entregables obtenidos correctamente",
      data: deliverables,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener entregables",
      error: error.message,
    });
  }
});

// Crear un nuevo entregable
DeliverableRouter.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, userId, docentId, file } = req.body;

    // Validar campos requeridos
    if (!title || !description || !dueDate || !userId || !docentId) {
      return res.status(400).json({
        message:
          "Título, descripción, fecha límite, usuario y docente son obligatorios",
      });
    }

    // Validar que la fecha sea válida
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate)) {
      return res.status(400).json({
        message: "Fecha inválida",
      });
    }

    const newDeliverable = new Deliverable({
      title,
      description,
      dueDate: parsedDueDate,
      userId,
      docentId,
      file,
    });

    await newDeliverable.save();
    await newDeliverable.populate("userId", "name email");

    return res.status(201).json({
      message: "Entregable creado correctamente",
      data: newDeliverable,
    });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return res.status(500).json({
      message: "Error al crear entregable",
      error: error.message,
      details: error.stack,
    });
  }
});

// Actualizar un entregable
DeliverableRouter.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedDeliverable = await Deliverable.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    ).populate("userId", "name email");

    if (!updatedDeliverable) {
      return res.status(404).json({
        message: "Entregable no encontrado",
      });
    }

    return res.status(200).json({
      message: "Entregable actualizado correctamente",
      data: updatedDeliverable,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar entregable",
      error: error.message,
    });
  }
});

// Eliminar un entregable
DeliverableRouter.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedDeliverable = await Deliverable.findByIdAndDelete(id);

    if (!deletedDeliverable) {
      return res.status(404).json({
        message: "Entregable no encontrado",
      });
    }

    return res.status(200).json({
      message: "Entregable eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar entregable",
      error: error.message,
    });
  }
});

// Subir un archivo para un entregable
DeliverableRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { deliverableId } = req.body;
    const file = req.file;

    if (!file || !deliverableId) {
      return res.status(400).json({
        message: "Archivo o ID de entregable no proporcionado",
      });
    }

    // Obtener la conexión de MongoDB
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db);

    // Crear un upload stream de GridFS
    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: {
        mimetype: file.mimetype,
        size: file.size,
        deliverableId: deliverableId,
        uploadDate: new Date(),
      },
    });

    // Escribir el archivo en GridFS
    uploadStream.end(file.buffer);

    uploadStream.on("finish", () => {
      return res.status(200).json({
        message: "Archivo subido correctamente",
        fileId: uploadStream.id,
      });
    });

    uploadStream.on("error", (error) => {
      console.error("Error uploading file to GridFS:", error);
      return res.status(500).json({
        message: "Error al subir el archivo",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      message: "Error al subir el archivo",
      error: error.message,
    });
  }
});

export default DeliverableRouter;
