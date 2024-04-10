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
