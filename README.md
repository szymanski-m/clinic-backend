Konfiguracja:
1. Pobierz projekt
2. Uruchom `npm install`
3. Uruchom za pomocą `node index.js`
4. Serwer stoi!

Teraz możesz wysłać przykładowy request rejestracji, przykładowy curl:
```
curl --location 'http://localhost:3000/register' \
--header 'Content-Type: application/json' \
--data '{
    "email": "test",
    "password": "test",
    "name": "test",
    "surname": "test2",
    "birth_date": "2000-05-24",
    "address": "dd",
    "phone": "+48123123123"
}
'
```


Endpointy:

### `/register`

- **Metoda:** POST
- **Opis:** Rejestracja nowego użytkownika.
- **Ciało żądania:** JSON zawierający dane użytkownika (email, password, name, surname, birth_date, address, phone).
- **Odpowiedzi:**
  - `200 OK` - Użytkownik został zarejestrowany pomyślnie.
  - `400 Bad Request` - Nieprawidłowe żądanie.
  - `500 Internal Server Error` - Wystąpił błąd serwera.

### `/login`

- **Metoda:** POST
- **Opis:** Logowanie użytkownika.
- **Ciało żądania:** JSON zawierający dane logowania (email, password).
- **Odpowiedzi:**
  - `200 OK` - Użytkownik zalogowany pomyślnie, zwraca token JWT.
  - `400 Bad Request` - Nieprawidłowe dane logowania.
  - `500 Internal Server Error` - Wystąpił błąd serwera.

### `/protected`

- **Metoda:** GET
- **Opis:** Chroniony endpoint, dostępny tylko dla użytkowników z poprawnym tokenem JWT.
- **Odpowiedzi:**
  - `200 OK` - Dostęp udzielony.
  - `401 Unauthorized` - Brak autoryzacji.

### `/doctors`

- **Metoda:** GET
- **Opis:** Pobiera listę lekarzy.
- **Odpowiedzi:**
  - `200 OK` - Zwraca listę lekarzy w formacie JSON.
  - `500 Internal Server Error` - Wystąpił błąd serwera.

### `/reserve-visit`

- **Metoda:** POST
- **Opis:** Rezerwuje wizytę u lekarza.
- **Ciało żądania:** JSON zawierający timestamp i ID lekarza.
- **Odpowiedzi:**
  - `200 OK` - Wizyta zarezerwowana pomyślnie.
  - `400 Bad Request` - Nieprawidłowe żądanie.
  - `500 Internal Server Error` - Wystąpił błąd serwera.

### `/doctor/visits`

- **Metoda:** GET
- **Opis:** Pobiera wizyty dla danego lekarza.
- **Odpowiedzi:**
  - `200 OK` - Zwraca listę wizyt w formacie JSON.
  - `403 Forbidden` - Brak autoryzacji.
  - `500 Internal Server Error` - Wystąpił błąd serwera.

### `/patient/visits`

- **Metoda:** GET
- **Opis:** Pobiera wizyty dla danego pacjenta.
- **Odpowiedzi:**
  - `200 OK` - Zwraca listę wizyt w formacie JSON.
  - `403 Forbidden` - Brak autoryzacji.
  - `500 Internal Server Error` - Wystąpił błąd serwera.
