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
const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();
// participante:
// {
//     name: 'João',
//     lastStatus: 12313123
// }

//Mensagem:
// {
//     from: 'João',
//     to: 'Todos', 
//     text: 'oi galera', 
//     type: 'message', 
//     time: '20:04:37'
// }

mongoClient.connect().then(() => {
    
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

