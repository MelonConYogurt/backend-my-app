import express from "express";
import cors from "cors";
import UserRouter from "./controllers/user.js";
import DeliverableRouter from "./controllers/deliverable.js";
import RubricRouter from "./controllers/rubric.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", UserRouter);
app.use("/deliverables", DeliverableRouter);
app.use("/rubrics", RubricRouter);

export default app;
