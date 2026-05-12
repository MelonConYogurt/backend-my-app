import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { deliverableSchema } from "../Schemas/deliverable.js";
import { userSchema } from "../Schemas/user.js";
import { fileSchema } from "../Schemas/files.js";

const Deliverable = mongoose.model("deliverable", deliverableSchema);
const File = mongoose.model("document", fileSchema);
const User = mongoose.model("user", userSchema);
const DeliverableRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
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

DeliverableRouter.get("/student/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;

    const deliverables = await Deliverable.find({ userId }).sort({
      createdAt: -1,
    });

    const stats = {
      total: deliverables.length,
      completado: deliverables.filter((d) => d.status === "completado").length,
      entregado: deliverables.filter((d) => d.status === "entregado").length,
      pendiente: deliverables.filter((d) => d.status === "pendiente").length,
      rechazado: deliverables.filter((d) => d.status === "rechazado").length,
      averageRating:
        deliverables.filter((d) => d.rating).length > 0
          ? (
              deliverables
                .filter((d) => d.rating)
                .reduce((sum, d) => sum + d.rating, 0) /
              deliverables.filter((d) => d.rating).length
            ).toFixed(1)
          : 0,
      recentDeliverables: deliverables.slice(0, 5),
    };

    return res.status(200).json({
      message: "Estadísticas obtenidas correctamente",
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  }
});

DeliverableRouter.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, userId, docentId, file, rubricId } =
      req.body;

    if (
      !title ||
      !description ||
      !dueDate ||
      !userId ||
      !docentId ||
      !rubricId
    ) {
      return res.status(400).json({
        message: "Faltan campos",
      });
    }

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
      rubricId,
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

DeliverableRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { deliverableId } = req.body;
    const file = req.file;

    if (!file || !deliverableId) {
      return res.status(400).json({
        message: "Archivo o ID de entregable no proporcionado",
      });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "documents",
    });

    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: {
        mimetype: file.mimetype,
        size: file.size,
        deliverableId: deliverableId,
        uploadDate: new Date(),
      },
    });

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

DeliverableRouter.get("/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id;

    if (!fileId) {
      return res.status(404).json({
        message: "No se proporciono un id",
      });
    }

    const filedata = await File.findById(fileId);

    if (!filedata) {
      return res.status(404).json({
        message: "Archivo no encontrado",
        response: filedata,
      });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "documents",
    });

    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId),
    );

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filedata.filename}"`,
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      message: "Error interno",
      error: error.message,
    });
  }
});

export default DeliverableRouter;
