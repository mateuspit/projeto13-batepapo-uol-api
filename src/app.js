import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import apiPort from "../constants/apiPort.js";

const server = express();
server.use(cors());
server.use(express.json());

server.listen(apiPort, ()=>console.log(`API running at port ${apiPort}`));

