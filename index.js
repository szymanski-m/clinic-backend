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

// Middleware do sprawdzania, czy użytkownik jest doktorem
const isDoctor = (req, res, next) => {
    if (req.user.type !== 'doctor') {
        return res.sendStatus(403);
    }
    next();
};

// Middleware do sprawdzania, czy użytkownik jest pacjentem
const isPatient = (req, res, next) => {
    if (req.user.type !== 'patient') {
        return res.sendStatus(403);
    }
    next();
};

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

// Endpoint rejestracji
app.post('/register', async (req, res) => {
    console.log(req)
    console.log(req.body)
    console.log(req.query)
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
            await db.execute(`INSERT INTO patients (email, password) VALUES (?, ?)`, 
            [email, hashedPassword]);

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
            const [doctor] = await db.execute(`SELECT * FROM doctors WHERE email = ?`, [email]);
            const [receptionist] = await db.execute(`SELECT * FROM reception WHERE email = ?`, [email]);

            if (user.length === 0 && doctor.length === 0 && receptionist.length === 0) {
                return res.status(400).send('Invalid credentials');
            }

            const userData = user[0] || receptionist[0] || doctor[0];
            let userType;
            if(user[0]) {
                userType = 'patient'
            } else if(doctor[0]) {
                userType = 'doctor'
            } else if(receptionist[0]) {
                userType = 'receptionist'
            }

            // Sprawdzanie hasła
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (!passwordMatch) {
                return res.status(400).send('Invalid credentials');
            }

            // Generowanie tokena JWT
            const token = jwt.sign({ id: userData.id, email: userData.email, type: userType }, JWT_SECRET, { expiresIn: '1h' });

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

// Endpoint GET doktorzy
app.get('/doctors', async (req, res) => {
    try {
        const [doctors] = await db.execute(`SELECT id, name, surname FROM doctors`);
        res.status(200).json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint POST Rezerwacja wizyty
app.post('/reserve-visit', authenticateToken, async (req, res) => {
    const { timestamp, doctor_id } = req.body;
    const patient_id = req.user.id;

    if (!timestamp || !doctor_id) {
        return res.status(400).send('Bad Request');
    }

    try {
        await db.execute(`INSERT INTO visits (patient_id, doctor_id, visit_timestamp, status, about_visit) VALUES (?, ?, ?, 'Oczekiwanie', '')`, 
        [patient_id, doctor_id, timestamp]);

        res.status(200).send('Visit reserved successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint GET wizyty dla doktora
app.get('/doctor/visits', authenticateToken, isDoctor, async (req, res) => {
    const doctor_id = req.user.id;

    try {
        const [visits] = await db.execute(`
            SELECT v.id, v.patient_id, p.name AS patient_name, p.surname AS patient_surname, v.visit_timestamp, v.status
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            WHERE v.doctor_id = ?
            ORDER BY v.visit_timestamp ASC
        `, [doctor_id]);

        res.status(200).json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint GET wizyty dla pacjenta
app.get('/patient/visits', authenticateToken, isPatient, async (req, res) => {
    const patient_id = req.user.id;

    try {
        const [visits] = await db.execute(`
            SELECT v.id, v.doctor_id, d.name AS doctor_name, d.surname AS doctor_surname, v.visit_timestamp, v.status
            FROM visits v
            JOIN doctors d ON v.doctor_id = d.id
            WHERE v.patient_id = ?
            ORDER BY v.visit_timestamp ASC
        `, [patient_id]);

        res.status(200).json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Nasłuchiwanie na określonym porcie
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
