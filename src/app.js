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
    const { to, text, type } = req.body;
    const from = req.headers.from;

    const userEnterDate = new Date(Date.now());
    const hours = userEnterDate.getHours();
    const minutes = userEnterDate.getMinutes();
    const seconds = userEnterDate.getSeconds();
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const sendableObjectMessage = {
        to,
        text,
        type,
        from,
        time: timeString
    };

    const { error, value } = validateMessage(sendableObjectMessage);
    if (error) {
        return res.status(422).send("Erro");
    }

    db.collection("messages").insertOne(sendableObjectMessage)
        .then(() => res.sendStatus(201))
        .catch((err) => console.log(err));
});

server.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const limit = req.query.limit;
    // console.log(user);
    try {
        const allMessages = await db.collection("messages").find().toArray();
        // console.log(allMessages);
        let allowedMessages = allMessages.filter(am => (am.to === user) || (am.from === user) || (am.to === "Todos"));
        // console.log("allowed:   ",allowedMessages);
        if (!(limit > 0) && !(typeof limit === "number") && (limit !== undefined)) {
            return res.status(422).send("limite invalido");
        }
        else if (limit) {
            allowedMessages = allowedMessages.slice(-limit);
        }
        res.send(allowedMessages);
    }
    catch (erro) {
        console.error(erro);
        res.status(500).send("Erro interno do servidor");
    }
});

server.post("/status", async (req, res) => {
    const user = req.headers.user;
    // console.log(user)

    if (!user) {
        return res.status(404).send("Esse user não existe");
    }

    const allUsers = await db.collection("participants").find().toArray();
    // console.log(allUsers);
    const userExists = allUsers.find(au => au.name === user);
    // console.log("userExists",userExists);
    if (!userExists) {
        return res.sendStatus(404);
    }

    const userEnterDate = new Date(Date.now());

    const hours = userEnterDate.getHours();
    const minutes = userEnterDate.getMinutes();
    const seconds = userEnterDate.getSeconds();

    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    // console.log(timeString);

    db.collection("participants").updateOne(
        { _id: userExists._id },
        { $set: { lastStatus: timeString } },
        (err, result) => {
            if (err) {
                return res.status(500).send('Erro interno do servidor');
            }
            else {
                res.sendStatus(200);
            }
        });

    res.send(userExists);
});

setInterval(removeIdleUser, 15000);
// setInterval(removeIdleUser, 5000);

async function removeIdleUser() {
    try {
        const allUsers = await db.collection("participants").find().toArray();
        // console.log(allUsers);

        const newDataTimeStamp = new Date(Date.now());
            const hours = newDataTimeStamp.getHours();
            const minutes = newDataTimeStamp.getMinutes();
            const seconds = newDataTimeStamp.getSeconds();
            const newData = `${hours.toString().padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        const refreshedUsers = allUsers.filter((au) => {
            const oldDataSeconds = Number(au.lastStatus.split(":")[2]);

            // const newDataTimeStamp = new Date(Date.now());
            // const hours = newDataTimeStamp.getHours();
            // const minutes = newDataTimeStamp.getMinutes();
            // const seconds = newDataTimeStamp.getSeconds();
            // const newData = `${hours.toString().padStart(2, "0")}:${minutes
            //     .toString()
            //     .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

            const newDataSeconds = Number(newData.split(":")[2])


            let conditionNewIsHigher = newDataSeconds > oldDataSeconds;
            let conditionDiffIsMoreThanTen = (newDataSeconds - oldDataSeconds) > 10;
            let conditionSame = newDataSeconds === oldDataSeconds;
            if ((conditionNewIsHigher && conditionDiffIsMoreThanTen) || conditionSame) {
                return false;
            }

            let conditionNewIsLower = newDataSeconds < oldDataSeconds;
            conditionDiffIsMoreThanTen = ((newDataSeconds + 60) - oldDataSeconds) > 10;
            conditionSame = newDataSeconds === oldDataSeconds;
            if ((conditionNewIsLower && conditionDiffIsMoreThanTen) || conditionSame) {
                return false;
            }
            console.log(newData);

            return true;
        });

        console.log(refreshedUsers);
        const deleteResult = await db.collection("participants").deleteMany({});
        if (!deleteResult.deletedCount) return console.log("Nada deletado, nao tinha nada");
        console.log("participantes foram deletados");

        await db.collection("participants").insertMany(refreshedUsers);
        console.log("participants atualizados");

        const goodByeUsers = allUsers.filter(au => !refreshedUsers.some(ru => ru.name === au.name));
        // console.log(goodByeMessage);

        const goodByeMessages = goodByeUsers.map(gbu => {
            return {
                from: gbu.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: newData
            };
        });

        await db.collection("messages").insertMany(goodByeMessages);
        console.log("Messagens de partidas att");
    }

    catch (err) {
        console.log({ message: err.message });
    }
}
// removeIdleUser(); 

server.listen(apiPort, () => console.log(`API running at port ${apiPort}`));

