require(`dotenv`).config();
const sqlite3 = require('sqlite3').verbose();
const DBSOURCE_1 = process.env.DB_SOURCE_1 || "db.sqlite";
const DBSOUCRE_2 = process.env.DB_SOURCE_2


const dbMovies = new sqlite3.Database(DBSOURCE_1, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        dbMovies.run(`CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    director TEXT NOT NULL, 
    year INTEGER NOT NULL
);`, (err) => {
    if (!err) {
        console.log("Table already created. Seeding initial data");
        const insert = 'INSERT INTO movies (title, director, year) VALUES (?,?,?)';
        dbMovies.run(insert, ["Moana", "Don Hall", 2016]);
        dbMovies.run(insert, ["piderman", "Jon Watts", 2018]);
        dbMovies.run(insert, ["Inside Out", "Pete Docter", 2015]);
    } else {
        console.log("Table 'movies' already exists.");
    }
});

  }

    }
);

const dbDirectors = new sqlite3.Database(DBSOUCRE_2, (err) => {
    if (err) {
        console.error("Error:", err.message);
        throw err;
    }
    console.log(`Berhasil terhubung ke database: ${DBSOUCRE_2}`);
    dbDirectors.run(
        `CREATE TABLE IF NOT EXISTS directors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            birthYear INTEGER NOT NULL
        )`,
        (err) => {
            if (!err) {
                console.log("Tabel 'directors' berhasil dibuat. Masukan data awal....");
                const insert = 'INSERT INTO directors (name, birthYear) VALUES (?,?)';
                dbDirectors.run(insert, ["Don Hall", 1980]);
                dbDirectors.run(insert, ["Jon Watts", 1985]);
                dbDirectors.run(insert, ["Pete Docter", 1990]);
            } else {
                console.log("Tabel 'directors' sudah ada");
            }
        }
    );
});
module.exports = {
    dbMovies,
    dbDirectors
};