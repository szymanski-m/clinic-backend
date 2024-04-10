module.exports = function(req, res) {
    // Tutaj umieść logikę logowania
    const { username, password } = req.body;
    // Przykładowa logika logowania
    if (username && password) {
        // Tutaj można dodać kod obsługujący autentykację użytkownika
        res.status(200).send('Logged in successfully');
    } else {
        res.status(400).send('Bad Request');
    }
};