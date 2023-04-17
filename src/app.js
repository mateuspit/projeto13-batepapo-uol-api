import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
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
    console.log("MongoDB running")
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
            lastStatus: Date.now(),
        });

        db.collection("messages").insertOne({
            from: value.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: timeString,
        });

        res.status(201).send("Usuario criado");

    }
    catch (error) {
        console.error(error);
        res.status(500).send("Erro interno do servidor");
    }
});


server.get("/participants", async (req, res) => {
    const allUsers = await db.collection("participants").find().toArray();
    return res.send(allUsers);
});

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;

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
        return res.status(422).send(error.details.map((detail) => detail.message));
    }

    const participantsOnline = await db.collection("participants").find().toArray();
    // console.log("participantsOnline: ",participantsOnline);
    if (!participantsOnline) {
        return res.status(422).send("Não encontramos ninguem online :(")
    }

    const userExists = participantsOnline.find(po => po.name === from);
    // console.log("participantsOnline: ",participantsOnline);
    // console.log("userExists: ",userExists);
    // console.log("from: ",from);
    if (!userExists) {
        return res.status(422).send("Usuario não encontrado");
    }

    // console.log(value)
    await db.collection("messages").insertOne(value);
    res.status(201).send("Mensagem enviada");
});

server.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const limit = req.query.limit;
    // console.log(user);
    try {
        const allMessages = await db.collection("messages").find().toArray();
        if (allMessages.length === 0) return res.send("Não existem mensagens")
        // console.log(allMessages);
        let allowedMessages = allMessages.filter(am => (am.to === user) || (am.from === user) || (am.to === "Todos"));
        // console.log("allowed:   ",allowedMessages);  
        if (!(limit > 0) && !(typeof limit === "number") && (limit !== undefined)) {
            // return res.status(422).send("limite invalido");
            return res.sendStatus(422);
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
        return res.status(404).send("Header não foi passado");
    }

    const allUsers = await db.collection("participants").find().toArray();
    // console.log(allUsers);
    const userExists = allUsers.find(au => au.name === user);
    console.log("userExists",userExists);
    if (!userExists) {
        return res.status(404).send("Participante não está na lista");
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
        { $set: { lastStatus: Date.now() } },
        (err, result) => {
            if (err) {
                return res.status(500).send('Erro interno do servidor');
            }
            else {
                res.sendStatus(200);
            }
        });

    res.status(201).send(userExists);
});

server.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    // try {
    const user = req.headers.user;
    const messageId = req.params.ID_DA_MENSAGEM;
    // console.log(user);
    // console.log(messageId);

    const userSendMessageIsTheSame = await db.collection("messages").findOne({ _id: new ObjectId(messageId) });
    // console.log(userSendMessageIsTheSame.from);
    if (!userSendMessageIsTheSame) return res.sendStatus(404);
    if (userSendMessageIsTheSame.from === user) {
        const result = await db.collection("messages").deleteOne({ _id: new ObjectId(messageId) });
        if (!result.deletedCount) return res.sendStatus(404);
        res.status(200).send("Menssagem deletado com sucesso")
    }
    else {
        res.sendStatus(401);
    }
    // }
    // catch (err) {
    //     res.status(500).send("catch parceiro");
    // }
});

server.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;
    const messageId = req.params.ID_DA_MENSAGEM;

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
    // console.log(messageExist);
    if (!messageExist) return res.sendStatus(404)
    // console.log(messageExist);
    // console.log(messageExist.from);
    // console.log(from);
    if (messageExist.from === from) {
        const result = await db.collection("messages")
            .updateOne({ _id: new ObjectId(messageId) }, { $set: value });
        // console.log(result.matchedCount);
        // console.log(!!result.matchedCount);
        // if (!result.matchedCount) return res.status(404).send("nada mudou");
        res.status(200).send("Menssagem update com sucesso")
    }
    else {
        return res.status(401).send("User sem permissao");
    }


    // console.log(value);

    // res.send("teste amigo")
});

// setInterval(removeIdleUser, 1500000);
setInterval(removeIdleUser, 15000);

async function removeIdleUser() {
    const allUsers = await db.collection("participants").find().toArray();
    if (allUsers.length === 0) return console.log("Nada deletado, nao tinha ninguem");

    let newDataTimeStamp = Date.now();
    // const hours = newDataTimeStamp.getHours();
    // const minutes = newDataTimeStamp.getMinutes();
    // const seconds = newDataTimeStamp.getSeconds();
    // const newData = `${hours.toString().padStart(2, "0")}:${minutes
    //     .toString()
    //     .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const refreshedUsers = allUsers.filter((au) => {
        // const oldDataSeconds = Number(au.lastStatus.split(":")[2]);

        // const newDataSeconds = Number(newData.split(":")[2])


        // let conditionNewIsHigher = newDataSeconds > oldDataSeconds;
        // let conditionDiffIsMoreThanTen = (newDataSeconds - oldDataSeconds) > 10;
        // let conditionSame = newDataSeconds === oldDataSeconds;
        const timeDiff = newDataTimeStamp - au.lastStatus;
        if (timeDiff > 10) {
            return false;
        }

        // let conditionNewIsLower = newDataSeconds < oldDataSeconds;
        // conditionDiffIsMoreThanTen = ((newDataSeconds + 60) - oldDataSeconds) > 10;
        // conditionSame = newDataSeconds === oldDataSeconds;
        // if ((conditionNewIsLower && conditionDiffIsMoreThanTen) || conditionSame) {
        //     return false;
        // }

        return true;
    });

    await db.collection("participants").deleteMany({});
    console.log("Participantes foram deletados");

    console.log("permaneceram: ", refreshedUsers);

    console.log("refreshedUsers.length", refreshedUsers.length)
    if (refreshedUsers.length !== 0) {
        console.log("Entrou no if")
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

