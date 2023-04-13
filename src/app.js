import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import apiPort from "../constants/apiPort.js";
// const { validateUser } = require("./../schemas/userSchema.js");
import Joi from "joi"
import { validateUser } from "./../schemas/userSchema.js";
import { validateMessage } from "../schemas/messageSchema.js";

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

    // db.collection("contatos").find().toArray()
    //     .then(contatos => {
    //         console.log(contatos)
    //     });
}).catch((err) => console.log(err.message));

server.post("/participants", async (req, res) => {
    try {
        const { error, value } = validateUser(req.body);

        if (error) {
            return res.status(422).send("Erro");
        }

        const allUsers = await db.collection("participants").find().toArray();
        const userExists = allUsers.find((au) => au.name === value.name);

        if (userExists) {
            return res.status(409).send("Erro digite outro nome");
        }

        const userEnterDate = new Date(Date.now());

        const hours = userEnterDate.getHours();
        const minutes = userEnterDate.getMinutes();
        const seconds = userEnterDate.getSeconds();

        const timeString = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        db.collection("participants").insertOne({
            name: value.name,
            lastStatus: timeString,
        });

        db.collection("messages").insertOne({
            from: value.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: timeString,
        });

        res.status(201).send("Deu bom");

    }
    catch (error) {
        console.error(error);
        res.status(500).send("Erro interno do servidor");
    }
});


server.get("/participants", (req, res) => {
    db.collection("participants").find().toArray().then((allUsers) => {
        return res.send(allUsers);
    });
});

server.post("/messages", (req, res) => {

});

server.listen(apiPort, () => console.log(`API running at port ${apiPort}`));

