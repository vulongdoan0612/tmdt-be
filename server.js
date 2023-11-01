import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRouter from "./routes/userRoutes.js";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to database");
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();
app.use(cors());

app.use(express.json());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use("/", jobRouter);
app.use("/", userRouter);
// app.use("/", employerRouter);

const corsOptions = {
  origin: "http://localhost:3000/", // Đổi thành domain của ứng dụng web frontend của bạn
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Cho phép sử dụng cookie và header xác thực
};

app.use(cors(corsOptions));

app.get("/", async (req, res) => {
  res.json("hello");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
