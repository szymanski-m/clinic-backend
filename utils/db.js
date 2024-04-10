import "dotenv/config";

import mysql from 'mysql2/promise';

 // create the connection to database
  const db = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD
  });


export default db;