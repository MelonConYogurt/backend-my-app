import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { deliverableSchema } from "../Schemas/deliverable.js";
import { userSchema } from "../Schemas/user.js";
import { fileSchema } from "../Schemas/files.js";
import { Resend } from "resend";

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
    const { title, description, dueDate, userId, docentId, rubricId } =
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
      rubricId,
    });

    await newDeliverable.save();

    const populatedDeliverable = await populateDeliverable(
      Deliverable.findById(newDeliverable._id),
    );

    const student = await User.findById(userId);
    const docent = await User.findById(docentId);

    const resend = new Resend(resendApiKey);
    const frontendUrl = "http://localhost:3000/student/entregables";

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: student.email,
      subject: "Nuevo entregable asignado",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          background-color: #f4f7fb;
          padding: 40px 20px;
        ">
          <div style="
            max-width: 650px;
            margin: auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          ">
    
            <div style="
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              padding: 30px;
              text-align: center;
            ">
            <h1 style="
            color: white;
            margin: 0;
            font-size: 28px;
          ">
            Nuevo Entregable
          </h1>
            </div>
    
            <div style="padding: 35px;">
    
              <p style="
                font-size: 16px;
                color: #374151;
                line-height: 1.6;
              ">
                Hola <strong>${student.name}</strong>,
                <br /><br />
                Se te ha asignado un nuevo entregable. Aquí tienes los detalles:
              </p>
    
              <div style="
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 25px;
                margin-top: 25px;
              ">
    
                <p style="margin: 10px 0;">
                  <strong> Título:</strong><br />
                  ${title}
                </p>
    
                <p style="margin: 10px 0;">
                  <strong>Descripción:</strong><br />
                  ${description}
                </p>
    
                <p style="margin: 10px 0;">
                  <strong> Fecha de entrega:</strong><br />
                  ${new Date(dueDate).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
    
                <p style="margin: 10px 0;">
                  <strong>Docente:</strong><br />
                  ${docent.name}
                </p>
    
              </div>
    
              <div style="
                text-align: center;
                margin-top: 35px;
              ">
                <a
                  href="${frontendUrl}"
                  style="
                    background-color: #2563eb;
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 10px;
                    font-weight: bold;
                    display: inline-block;
                    font-size: 16px;
                  "
                >
                  Ver entregable
                </a>
              </div>
    
              <p style="
                margin-top: 40px;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
              ">
                Recuerda revisar tu entregable antes de la fecha límite.
              </p>
    
            </div>
          </div>
        </div>
      `,
    });

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
        message: "Hay un problema con los comentarios",
      });
    }

    const updatedDeliverable = await populateDeliverable(
      Deliverable.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }),
    );

    if (!updatedDeliverable) {
      return res.status(404).json({
        message: "Entregable no encontrado",
      });
    }

    const resend = new Resend(resendApiKey);
    const frontendUrl = "http://localhost:3000/student/entregables";

    const student = await User.findById(req.body.userId);

    console.log(student);

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: student.email,
      subject: "Cambios en tu entregable",
      html: `
      <div style="
      font-family: Arial, sans-serif;
      background-color: #f4f7fb;
      padding: 40px 20px;
    ">
      <div style="
        max-width: 650px;
        margin: auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      ">
    
        <div style="
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          padding: 35px 30px;
          text-align: center;
        ">
    
          <h1 style="
          color: white;
          margin: 0;
          margin: 0;
          font-size: 28px;
          ">
            Cambios en tu entregable
          </h1>
    
          <span style="
            display: inline-block;
            padding: 10px 18px;
            border-radius: 999px;
            font-weight: bold;
            font-size: 15px;
            text-transform: uppercase;
            color: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.12);
    
            background:
              ${
                req.body.status === "completado"
                  ? "#10b981"
                  : req.body.status === "entregado"
                    ? "#8b5cf6"
                    : req.body.status === "pendiente"
                      ? "#f59e0b"
                      : req.body.status === "rechazado"
                        ? "#f97316"
                        : "#6b7280"
              };
          ">

            Estado: ${req.body.status}
          </span>
    
        </div>
    
        <div style="padding: 35px;">
    
          <p style="
            font-size: 16px;
            color: #374151;
            line-height: 1.7;
            margin-top: 0;
          ">
            Hola <strong>${student.name}</strong>,
            <br /><br />
            Se han realizado cambios en tu entregable.
            Puedes revisarlos rápidamente haciendo clic en el botón de abajo.
          </p>
    
          <div style="
            text-align: center;
            margin-top: 35px;
          ">
            <a
              href="${frontendUrl}"
              style="
                background-color: #2563eb;
                color: white;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 10px;
                font-weight: bold;
                display: inline-block;
                font-size: 16px;
                box-shadow: 0 4px 10px rgba(37,99,235,0.3);
              "
            >
              Ver entregable
            </a>
          </div>
    
          <p style="
            margin-top: 40px;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            line-height: 1.5;
          ">
            Recuerda revisar tu entregable antes de la fecha límite.
          </p>
    
        </div>
      </div>
    </div>
      `,
    });

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
