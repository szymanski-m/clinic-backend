import "dotenv/config";
import mysql from "mysql2/promise";
import db from "./utils/db.js";
import express from 'express';
import {register} from "./controllers/register.js";
import bodyParser from "body-parser";

const app = express();


// Ustawienie bodyParser do parsowania ciała żądania
app.use(bodyParser.json());

// Endpoint rejestracji
app.post('/register', (req, res) => {
    // Sprawdzanie, czy istnieje kontroler dla rejestracji
    register(req, res);
});

// Endpoint logowania
app.post('/login', (req, res) => {
        //loginController(req, res);
});

// Nasłuchiwanie na określonym porcie
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));