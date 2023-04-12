import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import apiPort from "../constants/apiPort.js";

const server = express();
server.use(cors());
server.use(express.json());
dotenv.config();

// const mongoClient = new MongoClient("mongodb://localhost:27017/nomeDoBanco");
const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db();
    db.collection("contatos").find().toArray()
        .then(contatos => {
            console.log(contatos)
        });
}).catch((err) => console.log(err.message));

// db.collection("contatos").find().toArray()
//     .then(contatos => {
//         console.log(contatos)
//     });

server.listen(apiPort, () => console.log(`API running at port ${apiPort}`));

