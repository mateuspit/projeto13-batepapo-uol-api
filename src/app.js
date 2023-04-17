import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import apiPort from "../constants/apiPort.js";
import { validateUser } from "./../schemas/userSchema.js";
import { validateMessage } from "../schemas/messageSchema.js";
import { stripHtml } from "string-strip-html";

const server = express();
server.use(cors());
server.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();
const catchError = "Erro interno do servidor";

mongoClient.connect().then(() => {
    console.log("MongoDB running");
}).catch((err) => console.log(err.message));

server.post("/participants", async (req, res) => {
    const username = req.body;
    const { error, value } = validateUser(username);

    if (error) return res.status(422).send("Erro");

    const usernameWithoutBlanckSpaces = value.name.trim();
    const usernameSanatized = { name: stripHtml(usernameWithoutBlanckSpaces).result };
    try {


        const allUsers = await db.collection("participants").find().toArray();
        const userExists = allUsers.find((au) => au.name === value.name);

        if (userExists) return res.status(409).send("Erro digite outro nome");

        const timeStampUserEnterDate = Date.now();
        const userEnterDate = new Date(timeStampUserEnterDate);

        const hours = userEnterDate.getHours();
        const minutes = userEnterDate.getMinutes();
        const seconds = userEnterDate.getSeconds();

        const timeString = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        db.collection("participants").insertOne({
            name: usernameSanatized.name,
            lastStatus: timeStampUserEnterDate,
        });

        db.collection("messages").insertOne({
            from: usernameSanatized.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: timeString,
        });

        res.status(201).send("Usuario criado");

    }
    catch (error) {
        console.error(error);
        res.status(500).send(catchError);
    }
});


server.get("/participants", async (req, res) => {
    const allUsers = await db.collection("participants").find().toArray();
    return res.send(allUsers);
});

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;

    if (!to || !text || !type || !from) return res.status(422).send("Erro, body está errado");

    const userEnterDate = new Date(Date.now());
    const hours = userEnterDate.getHours();
    const minutes = userEnterDate.getMinutes();
    const seconds = userEnterDate.getSeconds();
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const sendableObjectMessageSanitaze = {
        to: stripHtml(to).result.trim(),
        text: stripHtml(text).result.trim(),
        type: stripHtml(type).result.trim(),
        from: stripHtml(from).result.trim(),
        time: timeString
    };



    const { error, value } = validateMessage(sendableObjectMessageSanitaze);
    if (error) return res.status(422).send(error.details.map((detail) => detail.message));

    const participantsOnline = await db.collection("participants").find().toArray();
    console.log(participantsOnline);
    if (participantsOnline.length === 0) return res.status(422).send("Não encontramos ninguem online :(");

    const userExists = participantsOnline.find(po => po.name === stripHtml(from).result);
    if (!userExists) return res.status(422).send("Usuario não encontrado");

    await db.collection("messages").insertOne(value);
    res.status(201).send("Mensagem enviada");
});

server.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const limit = req.query.limit;

    try {
        const allMessages = await db.collection("messages").find().toArray();
        if (allMessages.length === 0) return res.send(["Não existem mensagens"]);
        let allowedMessages = allMessages.filter(am => (am.to === user) || (am.from === user) || (am.to === "Todos"));

        if ((limit !== undefined && (isNaN(Number(limit))) || Number(limit) <= 0)) {
            return res.sendStatus(422);
        }
        else if (limit) {
            allowedMessages = allowedMessages.slice(-limit);
        }
        res.send(allowedMessages);
    }
    catch (erro) {
        console.error(erro);
        res.status(500).send(catchError);
    }
});

server.post("/status", async (req, res) => {
    const user = req.headers.user;

    if (!user) {
        return res.status(404).send("Header não foi passado");
    }

    const allUsers = await db.collection("participants").find().toArray();
    const userExists = allUsers.find(au => au.name === user);
    console.log("userExists", userExists);
    if (!userExists) {
        return res.status(404).send("Participante não está na lista");
    }

    db.collection("participants").updateOne(
        { _id: userExists._id },
        { $set: { lastStatus: Date.now() } },
        (err, result) => {
            if (err) {
                return res.status(500).send(catchError);
            }
            else {
                res.status(200).send(result);
            }
        });

    res.status(200).send(userExists);
});

server.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const user = req.headers.user;
    const messageId = req.params.ID_DA_MENSAGEM;

    const userSendMessageIsTheSame = await db.collection("messages").findOne({ _id: new ObjectId(messageId) });

    if (!userSendMessageIsTheSame) return res.sendStatus(404);
    if (userSendMessageIsTheSame.from === user) {
        const result = await db.collection("messages").deleteOne({ _id: new ObjectId(messageId) });
        if (!result.deletedCount) return res.sendStatus(404);
        res.status(200).send("Menssagem deletado com sucesso");
    }
    else {
        res.sendStatus(401);
    }
});

server.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;
    const messageId = req.params.ID_DA_MENSAGEM;

    if (!to || !text || !type) return res.status(422).send("Erro, body está errado");

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
    if (error) return res.status(422).send("Erro no body");

    const messageExist = await db.collection("messages").findOne({ _id: new ObjectId(messageId) });
    if (!messageExist) return res.sendStatus(404);
    if (messageExist.from === from) {
        await db.collection("messages")
            .updateOne({ _id: new ObjectId(messageId) }, { $set: value });
        res.status(200).send("Mensagem update com sucesso");
    }
    else {
        return res.status(401).send("User sem permissao");
    }
});

setInterval(removeIdleUser, 15000);

async function removeIdleUser() {
    const allUsers = await db.collection("participants").find().toArray();
    if (allUsers.length === 0) return console.log("Nada deletado, nao tinha ninguem");

    const newDataTimeStamp = Date.now();

    const refreshedUsers = allUsers.filter((au) => {
        const timeDiff = newDataTimeStamp - au.lastStatus;
        if (timeDiff > 10000) {
            return false;
        }

        return true;
    });

    await db.collection("participants").deleteMany({});
    console.log("Participantes foram deletados");

    console.log("permaneceram: ", refreshedUsers);

    console.log("refreshedUsers.length", refreshedUsers.length);
    if (refreshedUsers.length !== 0) {
        console.log("Entrou no if");
        await db.collection("participants").insertMany(refreshedUsers);
        console.log("Participants atualizados, tem gente on");
    }
    const goodByeUsers = allUsers.filter(au => !refreshedUsers.some(ru => ru.name === au.name));
    console.log("sairam:", goodByeUsers);
    if (goodByeUsers.length === 0) return console.log("Participants atualizados, ninguem saiu");



    const newDataTime = new Date(Date.now());
    const hours = newDataTime.getHours();
    const minutes = newDataTime.getMinutes();
    const seconds = newDataTime.getSeconds();
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    const goodByeMessages = goodByeUsers.map(gbu => {
        return {
            from: gbu.name,
            to: "Todos",
            text: "sai da sala...",
            type: "status",
            time: timeString
        };
    });

    console.log("goodByeMessages:", goodByeMessages);
    await db.collection("messages").insertMany(goodByeMessages);
    console.log("Messagens de partidas att");
}

server.listen(apiPort, () => console.log(`API running at port ${apiPort}`));

