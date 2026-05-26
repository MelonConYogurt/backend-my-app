import express from "express";
import { userSchema } from "../Schemas/user.js";
import { fileSchema } from "../Schemas/files.js";
import mongoose, { mongo } from "mongoose";
import bcrypt from "bcrypt";
import multer from "multer";

const User = mongoose.model("user", userSchema);
const File = mongoose.model("file", fileSchema);

const UserRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

UserRouter.get("/", async (req, res) => {
  try {
    const filter = req.query;

    let users;

    if (Object.keys(filter).length > 0) {
      users = await User.find(filter).select("-password");
    } else {
      users = await User.find().select("-password");
    }

    return res.status(200).json({
      message: "Usuarios obtenidos correctamente",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener usuarios",
      error: error.message,
    });
  }
});

UserRouter.get("/active/", async (req, res) => {
  try {
    const users = await User.find({ active: true }).select("-password");

    return res.status(200).json({
      message: "Usuarios obtenidos correctamente",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener usuarios",
      error: error.message,
    });
  }
});

UserRouter.post("/", async (req, res) => {
  try {
    const { name, email, password, role, active, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nombre, correo y contraseña son obligatorios",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Ya existe un usuario con ese correo",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      active,
    });

    await newUser.save();

    return res.status(201).json({
      message: "Usuario creado correctamente",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        active: newUser.active,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear usuario",
      error: error.message,
    });
  }
});

UserRouter.post("/validate", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al validar usuario",
      error: error.message,
    });
  }
});

UserRouter.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al eliminar usuario",
      error: error.message,
    });
  }
});

UserRouter.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.password) {
      delete req.body.password;
    }

    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      message: "Usuario actualizado correctamente",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar usuario",
      error: error.message,
    });
  }
});

export default UserRouter;
