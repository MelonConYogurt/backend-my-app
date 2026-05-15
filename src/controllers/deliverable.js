import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import "dotenv/config";
import { Resend } from "resend";
import { deliverableSchema } from "../Schemas/deliverable.js";
import { userSchema } from "../Schemas/user.js";
import { fileSchema } from "../Schemas/files.js";

const Deliverable = mongoose.model("deliverable", deliverableSchema);
const File = mongoose.model("document", fileSchema);
const User = mongoose.model("user", userSchema);
const DeliverableRouter = express.Router();
const resendApiKey = process.env.RESEND_API_KEY;

const populateDeliverable = (query) =>
  query
    .populate("userId")
    .populate("docentId", "name email role")
    .populate({ path: "comments.authorId", select: "name email role" });

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

    const deliverables = await populateDeliverable(
      Deliverable.find({ docentId }),
    ).sort({ createdAt: -1 });

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

    const deliverables = await populateDeliverable(
      Deliverable.find({ userId }),
    ).sort({ createdAt: -1 });

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
      totalComments: deliverables.reduce(
        (count, d) => count + (d.comments ? d.comments.length : 0),
        0,
      ),
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
    const {
      title,
      description,
      dueDate,
      userId,
      docentId,
      file,
      rubricId,
      feedback,
      comments,
    } = req.body;

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

    let formattedComments = [];
    if (comments) {
      if (!Array.isArray(comments)) {
        return res.status(400).json({
          message: "comments debe ser un arreglo",
        });
      }

      for (const comment of comments) {
        if (!comment.authorId || !comment.role || !comment.message) {
          return res.status(400).json({
            message: "Cada comentario debe tener authorId, role y message",
          });
        }

        if (!["student", "docent"].includes(comment.role)) {
          return res.status(400).json({
            message: "El role del comentario debe ser 'student' o 'docent'",
          });
        }
      }

      formattedComments = comments.map((comment) => ({
        authorId: comment.authorId,
        role: comment.role,
        message: comment.message,
        createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
      }));
    }

    const newDeliverable = new Deliverable({
      title,
      description,
      dueDate: parsedDueDate,
      userId,
      docentId,
      file,
      rubricId,
      feedback,
      comments: formattedComments,
    });

    await newDeliverable.save();

    const populatedDeliverable = await populateDeliverable(
      Deliverable.findById(newDeliverable._id),
    );

    return res.status(201).json({
      message: "Entregable creado correctamente",
      data: populatedDeliverable,
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

    if (req.body.comments && !Array.isArray(req.body.comments)) {
      return res.status(400).json({
        message: "comments debe ser un arreglo",
      });
    }

    const updatedDeliverable = await populateDeliverable(
      Deliverable.findByIdAndUpdate(id, req.body, {
        returnDocument: "after",
        runValidators: true,
      }),
    );

    const resend = new Resend(resendApiKey);

    const frontendUrl = "http://localhost:3000/student/entregables/";

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "alejopsornal@gmail.com",
      subject: "Cambios en tu entregable",
      html: `
    <div style="
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      padding: 40px;
    ">
      <div style="
        max-width: 600px;
        margin: auto;
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      ">
        
        <h1 style="
          color: #2563eb;
          text-align: center;
        ">
          📚 Cambios en tu entregable
        </h1>

        <p style="
          font-size: 16px;
          color: #333;
          line-height: 1.6;
        ">
          Hola,
          <br /><br />
          Se realizaron cambios en tu entregable. 
          Puedes revisarlos haciendo clic en el botón de abajo.
        </p>

        <div style="text-align:center; margin-top:30px;">
          <a 
            href="${frontendUrl}"
            style="
              background-color: #2563eb;
              color: white;
              padding: 14px 24px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              display: inline-block;
            "
          >
            Ver entregable
          </a>
        </div>

        <p style="
          margin-top:40px;
          font-size: 14px;
          color: #888;
          text-align:center;
        ">
          Este correo fue enviado automáticamente.
        </p>

      </div>
    </div>
  `,
    });

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

DeliverableRouter.get("/info/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deliverable = await populateDeliverable(Deliverable.findById(id));

    if (!deliverable) {
      return res.status(404).json({
        message: "Entregable no encontrado",
      });
    }

    return res.status(200).json({
      message: "Entregable obtenido correctamente",
      data: deliverable,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener entregable",
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

DeliverableRouter.get("/view/:id", async (req, res) => {
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

    const viewStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId),
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filedata.filename}"`,
    });

    viewStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      message: "Error interno",
      error: error.message,
    });
  }
});

DeliverableRouter.get("/docent/:docentId/stats", async (req, res) => {
  try {
    const { docentId } = req.params;

    const deliverables = await Deliverable.find({ docentId }).sort({
      createdAt: -1,
    });

    // Get unique students
    const students = await User.find({
      _id: { $in: deliverables.map((d) => d.userId) },
      role: "student",
    }).select("name email");

    const stats = {
      totalStudents: students.length,
      totalDeliverables: deliverables.length,
      totalComments: deliverables.reduce(
        (count, d) => count + (d.comments ? d.comments.length : 0),
        0,
      ),
      completado: deliverables.filter((d) => d.status === "completado").length,
      entregado: deliverables.filter((d) => d.status === "entregado").length,
      pendiente: deliverables.filter((d) => d.status === "pendiente").length,
      rechazado: deliverables.filter((d) => d.status === "rechazado").length,
      recentDeliverables: deliverables.slice(0, 5).map((d) => ({
        ...d.toObject(),
        studentName:
          students.find((s) => s._id.toString() === d.userId.toString())
            ?.name || "Desconocido",
        commentsCount: d.comments ? d.comments.length : 0,
      })),
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

export default DeliverableRouter;
