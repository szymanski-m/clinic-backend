import db from "../utils/db.js";

export const register =  async function(req, res) {
    const { email, password, name, surname, birth_date, address, phone } = req.body;
    // Przykładowa logika rejestracji
    if (email && password) {
        const registerQuery = await db.execute(`INSERT INTO patients (email, password, name, surname, birth_date, address, phone) VALUES ("${email}", "${password}", "${name}", "${surname}", "${birth_date}", "${address}", "${phone}")`);
        // Tutaj można dodać kod obsługujący rejestrację w bazie danych
        res.status(200).send('Registered successfully');
    } else {
        res.status(400).send('Bad Request');
    }
};




