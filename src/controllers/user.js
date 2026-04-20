import express from "express";
import { userSchema } from "../Schemas/user.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const User = mongoose.model("user", userSchema);
const UserRouter = express.Router();

// GET ALL USERS
UserRouter.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
});

// CREATE USER (CON CALLBACKS)
UserRouter.post("/", async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;

    // verificar si ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const saltRounds = 10;

    // generar salt
    bcrypt.genSalt(saltRounds, function (err, salt) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error generando salt" });
      }

      // generar hash
      bcrypt.hash(password, salt, async function (err, hash) {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Error en hash" });
        }

        try {
          const newUser = new User({
            name,
            email,
            password: hash,
            role,
            active,
          });

          await newUser.save();

          res.status(201).json({
            message: "Usuario creado exitosamente",
            user: { name, email, role },
          });
        } catch (saveError) {
          console.error(saveError);
          res.status(500).json({ message: "Error guardando usuario" });
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// LOGIN / VALIDATE (CON CALLBACKS)
UserRouter.post("/validate", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // comparar password
    bcrypt.compare(password, user.password, function (err, result) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error comparando contraseña" });
      }

      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error validando usuario" });
  }
});

export default UserRouter;
