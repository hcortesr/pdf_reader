import express from 'express';
import dotenv from 'dotenv'; import OpenAI from 'openai';
import cors from 'cors';
import multer from 'multer';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse')
import * as fs from 'fs';


dotenv.config(); // Leer archivo .env

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


const app = express();

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: 'https://pdfanalyzer.hectorcortes.com', // localhost:3000 para pruebas
    allowedHeaders: ['Content-Type']
}))

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    const a = req.query;
    res.send(a);
});

app.post('/ai', upload.single('pdfData'), async (req, res) => {
    res.setHeader('Content-Type', 'text/plain'); // Importante para streaming
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { query } = req.body;
    console.log(query);

    const file = req.file.buffer;


    const extractedText = await extractText(file);

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
            { role: 'developer', content: 'You are a bot that is explaning me something I want to know about a PDF that I have uploaded. Be brief unless is stated the opposite.' },
            { role: 'user', content: `Text extracted from pdf:${extractedText}. My prompt is:${query}` },
        ],
    });

    for await (const token of completion) {
        if (Object.keys(token.choices[0].delta).length != 0) {
            res.write(token.choices[0].delta.content);
        }

    }
    res.end();
});


app.listen(process.env.SERVER_PORT, () => {
    console.log(`Se esta escuchando http://localhost:${process.env.SERVER_PORT}`);
});


async function extractText(pdf) {
    const data = await pdfParse(pdf);
    return data.text;
}
