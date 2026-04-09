import express from "express";
import { userSchema } from "../Schemas/user.js";
import mongoose from "mongoose";

const User = mongoose.model("user", userSchema);

const UserRouter = express.Router();

UserRouter.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    console(error);
    res.status(500).json(`Error: ${error}`);
  }
});

UserRouter.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validar que el usuario no exista ya
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    // Crear nuevo usuario
    const newUser = new User({
      name,
      email,
      password,
      active: true,
      rol: "student",
    });

    // Guardar en la base de datos
    await newUser.save();

    res
      .status(201)
      .json({ message: "Usuario creado exitosamente", user: { name, email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el usuario" });
  }
});

UserRouter.post("/validate/", async (req, res) => {
  const { email } = req.body;
  const validateUser = await User.findOne({ email: email });

  if (validateUser) {
    return res.send(true);
  } else {
    return res.status(500).send(false);
  }
});

export default UserRouter;
