import "dotenv/config";
import mysql from "mysql2/promise";
import db from "./utils/db.js";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(bodyParser.json());
app.options("*", cors());

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Middleware do weryfikacji tokena JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware do sprawdzania, czy użytkownik jest doktorem
const isDoctor = (req, res, next) => {
  if (req.user.type !== "doctor") {
    return res.sendStatus(403);
  }
  next();
};

// Middleware do sprawdzania, czy użytkownik jest pacjentem
const isPatient = (req, res, next) => {
  if (req.user.type !== "patient") {
    return res.sendStatus(403);
  }
  next();
};

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// Endpoint rejestracji
app.post("/register", async (req, res) => {
  console.log(req);
  console.log(req.body);
  console.log(req.query);
  const { email, password, name, surname, birth_date, address, phone } =
    req.body;

  if (email && password) {
    try {
      // Sprawdzanie, czy użytkownik już istnieje
      const [existingUser] = await db.execute(
        `SELECT * FROM patients WHERE email = ?`,
        [email]
      );
      if (existingUser.length > 0) {
        return res.status(400).send("User already exists");
      }

      // Hashowanie hasła
      const hashedPassword = await bcrypt.hash(password, 10);

      // Rejestracja nowego użytkownika
      await db.execute(`INSERT INTO patients (email, password) VALUES (?, ?)`, [
        email,
        hashedPassword,
      ]);

      res.status(200).send("Registered successfully");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).send("Bad Request");
  }
});

// Endpoint logowania
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    try {
      // Pobieranie użytkownika z bazy danych
      const [user] = await db.execute(
        `SELECT * FROM patients WHERE email = ?`,
        [email]
      );
      const [doctor] = await db.execute(
        `SELECT * FROM doctors WHERE email = ?`,
        [email]
      );
      const [receptionist] = await db.execute(
        `SELECT * FROM reception WHERE email = ?`,
        [email]
      );

      if (
        user.length === 0 &&
        doctor.length === 0 &&
        receptionist.length === 0
      ) {
        return res.status(400).send("Invalid credentials");
      }

      const userData = user[0] || receptionist[0] || doctor[0];
      let userType;
      if (user[0]) {
        userType = "patient";
      } else if (doctor[0]) {
        userType = "doctor";
      } else if (receptionist[0]) {
        userType = "receptionist";
      }

      // Sprawdzanie hasła
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (!passwordMatch) {
        return res.status(400).send("Invalid credentials");
      }

      // Generowanie tokena JWT
      const token = jwt.sign(
        { id: userData.id, email: userData.email, type: userType },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).send("Bad Request");
  }
});

// Przykładowy chroniony endpoint
app.get("/protected", authenticateToken, (req, res) => {
  res.status(200).send("This is a protected route");
});

// Endpoint zapisywanie danych pacjenta (Rafał)
app.post("/updateDataPatient", authenticateToken, async (req, res) => {
  const { firstName, lastName, gender, birthdate, pesel, phone } = req.body;
  const email = req.user.email;
  if (!firstName || !lastName || !gender || !birthdate || !pesel || !phone) {
    return res.status(400).send("Bad Request");
  }

  try {
    await db.execute(
      `UPDATE patients SET name = ?, surname = ?, gender = ?, birth_date = ?, pesel = ?, phone = ? WHERE email = ?`,
      [firstName, lastName, gender, birthdate, pesel, phone, email]
    );

    res.status(200).send("Dane zapisane pomyślnie");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint GET doktorzy
app.get("/doctors", async (req, res) => {
  try {
    const [doctors] = await db.execute(`SELECT id, name, surname FROM doctors`);
    res.status(200).json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint POST Rezerwacja wizyty (Rafał)
app.post("/reserve-visit", authenticateToken, async (req, res) => {
  const { doctor, description } = req.body;
  const patient_id = req.user.id;
  console.log(req.body);
  if (!doctor || !description) {
    return res.status(400).send("Bad Request");
  }

  try {
    await db.execute(
      `INSERT INTO visitsReported (patient_id, doctor_id, about_visit) VALUES (?, ?, ?)`,
      [patient_id, doctor, description]
    );

    res.status(200).send("Visit reserved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint GET wizyty dla doktora
app.get("/doctor/visits", authenticateToken, isDoctor, async (req, res) => {
  const doctor_id = req.user.id;

  try {
    const [visits] = await db.execute(
      `
            SELECT v.id, v.patient_id, p.name AS patient_name, p.surname AS patient_surname, v.visit_timestamp, v.status
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            WHERE v.doctor_id = ?
            ORDER BY v.visit_timestamp ASC
        `,
      [doctor_id]
    );

    res.status(200).json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint GET wizyty dla pacjenta
app.get("/patient/visits", authenticateToken, isPatient, async (req, res) => {
  const patient_id = req.user.id;

  try {
    const [visits] = await db.execute(
      `
            SELECT v.id, v.doctor_id, d.name AS doctor_name, d.surname AS doctor_surname, v.visit_timestamp, v.status
            FROM visits v
            JOIN doctors d ON v.doctor_id = d.id
            WHERE v.patient_id = ?
            ORDER BY v.visit_timestamp ASC
        `,
      [patient_id]
    );

    res.status(200).json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint GET wizyty zgłoszone dla recepcji (Rafał)
app.get("/reception/reportedvisits", authenticateToken, async (req, res) => {
  try {
    const [visits] = await db.execute(
      `
      SELECT 
      v.id, 
      d.surname AS doctor_surname, 
      p.name AS patient_name, 
      p.surname AS patient_surname, 
      p.pesel AS patient_pesel,
      v.patient_id,
      v.doctor_id,
      v.about_visit
    FROM 
      visitsReported v
    JOIN 
      doctors d ON v.doctor_id = d.id
    JOIN 
      patients p ON v.patient_id = p.id
    ORDER BY 
      v.id ASC
          `
    );

    res.status(200).json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint GET wizyty zaakceptowane dla recepcji (Rafał)
app.get("/reception/acceptedvisits", authenticateToken, async (req, res) => {
  try {
    const [visits] = await db.execute(
      `
      SELECT 
      v.id, 
      d.surname AS doctor_surname, 
      p.name AS patient_name, 
      p.surname AS patient_surname, 
      p.pesel AS patient_pesel,
      v.patient_id,
      v.doctor_id,
      v.about,
      v.status,
      v.data,
      v.date_hour
    FROM 
      visitsAccept v
    JOIN 
      doctors d ON v.doctor_id = d.id
    JOIN 
      patients p ON v.patient_id = p.id
    ORDER BY 
      v.id ASC
          `
    );
    res.status(200).json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

//Get wizyty dla pacjenta (Rafal)
app.get("/patient/visit", authenticateToken, isPatient, async (req, res) => {
  const patient_id = req.user.id;

  try {
    const [visitsR] = await db.execute(
      `SELECT v.data, d.name AS doctor_name, d.surname AS doctor_surname, v.about_visit, v.status
        FROM 
        visitsReported v
        JOIN 
        doctors d ON v.doctor_id = d.id
        WHERE
        v.patient_id = ?`,
      [patient_id]
    );
    const [visitsA] = await db.execute(
      `SELECT v.data, v.date_hour, d.name AS doctor_name, d.surname AS doctor_surname, v.about,  'Zatwierdzona' AS status
      FROM 
        visitsAccept v
      JOIN 
        doctors d ON v.doctor_id = d.id
      WHERE
      v.patient_id = ?`,
      [patient_id]
    );

    res.status(200).json({ visitsR: visitsR, visitsA: visitsA });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint zatwierdzania wizyty (Rafał)
app.post("/acceptVisit", async (req, res) => {
  const { doctorId, patientId, aboutVisit, date, hour, visitId } = req.body;
  console.log(req.body);
  try {
    await db.execute(
      `INSERT INTO visitsAccept (doctor_id, patient_id, about, data, date_hour, status) VALUES (?, ?, ?, ?, ?, 'oczekujaca')`,
      [doctorId, patientId, aboutVisit, date, hour]
    );
    await db.execute(`DELETE FROM visitsReported WHERE id = ?`, [visitId]);
    res.status(200).send("Visit Accepted!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/loadPatientDataToPage", async (req, res) => {
  const { email } = req.query;
  try {
    const [patientData] = await db.execute(
      `SELECT name, surname, gender, birth_date, pesel, phone FROM patients WHERE email = ?`,
      [email]
    );
    res.status(200).json(patientData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Obsługa żądania DELETE na serwerze Node.js
app.delete("/reception/reportedvisits/:visitId", async (req, res) => {
  const visitId = req.params.visitId;
  try {
    await db.execute(`DELETE FROM visitsAccept WHERE id = ?`, [visitId]);
    res.status(200).send("Visit Deleted!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Get pokazywanie danych o wizycie dla doktora (Rafał)
app.get("/showdateaboutvisit/:visitId", authenticateToken, async (req, res) => {
  const { visitId } = req.params;
  console.log(visitId);
  try {
    const [dateaboutpatient] = await db.execute(
      `
      SELECT 
 
      p.name AS patient_name, 
      p.surname AS patient_surname, 
      p.pesel AS patient_pesel,
      p.birth_date AS birth_date,
      p.gender AS gender,
      v.about
    FROM 
      visitsAccept v
    JOIN 
      patients p ON v.patient_id = p.id
      WHERE v.id=? 
          `,
      [visitId]
    );
    if (dateaboutpatient.length > 0) {
      res.status(200).json(dateaboutpatient);
    } else {
      res.status(404).json({ message: "No patient data found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Nasłuchiwanie na określonym porcie
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
