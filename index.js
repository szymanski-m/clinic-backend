import "dotenv/config";
import mysql from "mysql2/promise";
import db from "./utils/db.js";
import express from 'express';
import bodyParser from "body-parser";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();

// Ustawienie bodyParser do parsowania ciała żądania
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware do weryfikacji tokena JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Endpoint rejestracji
app.post('/register', async (req, res) => {
    const { email, password, name, surname, birth_date, address, phone } = req.body;

    if (email && password) {
        try {
            // Sprawdzanie, czy użytkownik już istnieje
            const [existingUser] = await db.execute(`SELECT * FROM patients WHERE email = ?`, [email]);
            if (existingUser.length > 0) {
                return res.status(400).send('User already exists');
            }

            // Hashowanie hasła
            const hashedPassword = await bcrypt.hash(password, 10);

            // Rejestracja nowego użytkownika
            await db.execute(`INSERT INTO patients (email, password, name, surname, birth_date, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [email, hashedPassword, name, surname, birth_date, address, phone]);

            res.status(200).send('Registered successfully');
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(400).send('Bad Request');
    }
});

// Endpoint logowania
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (email && password) {
        try {
            // Pobieranie użytkownika z bazy danych
            const [user] = await db.execute(`SELECT * FROM patients WHERE email = ?`, [email]);
            if (user.length === 0) {
                return res.status(400).send('Invalid credentials');
            }

            const userData = user[0];

            // Sprawdzanie hasła
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (!passwordMatch) {
                return res.status(400).send('Invalid credentials');
            }

            // Generowanie tokena JWT
            const token = jwt.sign({ id: userData.id, email: userData.email }, JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({ token });
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(400).send('Bad Request');
    }
});

// Przykładowy chroniony endpoint
app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).send('This is a protected route');
});

// Nasłuchiwanie na określonym porcie
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
