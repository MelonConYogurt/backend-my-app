import express from "express";
import cors from "cors";
import UserRouter from "./controllers/user.js";
import DeliverableRouter from "./controllers/deliverable.js";


const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", UserRouter);
app.use("/deliverables", DeliverableRouter);

export default app;
