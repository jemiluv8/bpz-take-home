import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { InvoiceRoutes } from "./routes/invoices";

async function server() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  const db = "mongodb://127.0.0.1:27017/next-learn?replicaSet=rs0";

  try {
    await mongoose.connect(db, {});
    InvoiceRoutes(app);
  } catch (error) {
    console.log("There was an error starting the database");
    throw error;
  }

  server.listen(9909, "0.0.0.0", () => {
    console.log("Server started on port", `0.0.0.0:9909`);
  });
}

server()
  .then(() => console.log("server started"))
  .catch((e) => console.log("error starting server", e));
