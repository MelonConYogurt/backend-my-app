import express from "express";
import mongoose from "mongoose";
import { rubricSchema } from "../Schemas/rubric.js";

const RubricRouter = express.Router();

const Rubric = mongoose.model("rubric", rubricSchema);

RubricRouter.get("/", async (req, res) => {
  try {
    const filter = req.query;

    const rubrics =
      Object.keys(filter).length > 0
        ? await Rubric.find(filter)
        : await Rubric.find();

    return res.status(200).json({
      message: "Rúbricas obtenidas correctamente",
      data: rubrics,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener las rúbricas",
      error: error.message,
    });
  }
});

RubricRouter.post("/create", async (req, res) => {
  try {
    const { title, description, docentId, criterions } = req.body;

    console.log(req.body);

    if (!title || !description || !docentId) {
      return res.status(400).json({
        message: "Faltan datos obligatorios (title, description, docentId)",
      });
    }

    const rubricExist = await Rubric.findOne({
      title,
      docentId,
    });

    if (rubricExist) {
      return res.status(409).json({
        message: "Ya existe una rúbrica con este título para este docente",
      });
    }

    const newRubric = new Rubric({ title, description, docentId, criterions });
    const savedRubric = await newRubric.save();

    return res.status(201).json({
      message: "Rúbrica creada correctamente",
      data: savedRubric,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear la rúbrica",
      error: error.message,
    });
  }
});

RubricRouter.delete("/delete/:id", async (req, res) => {
  try {
    const rubricId = req.params.id;

    if (!rubricId) {
      return res.status(400).json({
        message: "El id es obligatorio",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(rubricId)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const deletedRubric = await Rubric.findByIdAndDelete(rubricId);

    if (!deletedRubric) {
      return res.status(404).json({
        message: "La rúbrica no existe",
      });
    }

    return res.status(200).json({
      message: "Rúbrica eliminada correctamente",
      data: deletedRubric,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar la rúbrica",
      error: error.message,
    });
  }
});

RubricRouter.patch("/update/:id", async (req, res) => {
  try {
    const rubricId = req.params.id;

    if (!rubricId) {
      return res.status(400).json({
        message: "El id es obligatorio",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(rubricId)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const updatedRubric = await Rubric.findByIdAndUpdate(rubricId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedRubric) {
      return res.status(404).json({
        message: "La rúbrica no existe",
      });
    }

    return res.status(200).json({
      message: "Rúbrica actualizada correctamente",
      data: updatedRubric,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar la rúbrica",
      error: error.message,
    });
  }
});

export default RubricRouter;
