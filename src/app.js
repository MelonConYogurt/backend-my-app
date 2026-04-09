import express from "express";
import cors from "cors";
import UserRouter from "./controllers/user.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", UserRouter);

export default app;
