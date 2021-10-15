import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { userRouter } from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config();

const url = "mongodb://localhost/Passreset";
app.use(express.json());
app.use(cors());

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const con = mongoose.connection;
con.on("open", () => console.log("MONGODB is Connected"));

app.get("/", (req, res) => {
  res.send("Welcome to Node App");
});
app.use("/", userRouter);
app.listen(PORT, () => console.log(`Server is Started at ${PORT}`));
