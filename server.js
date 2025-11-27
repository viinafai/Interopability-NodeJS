require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js');               // Koneksi PostgreSQL
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === STATUS ROUTE ===
app.get('/status', (req, res) => {
  res.json({ ok: true, service: 'film-api' });
});

// === AUTH ROUTES ===
app.post('/auth/register', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({
      error: 'Username dan password (min 6 char) harus diisi'
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql =
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';

    const result = await db.query(sql, [
      username.toLowerCase(),
      hashedPassword,
      'user'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

app.post('/auth/register-admin', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({
      error: 'Username dan password (min 6 char) harus diisi'
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql =
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';

    const result = await db.query(sql, [
      username.toLowerCase(),
      hashedPassword,
      'admin'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

// === LOGIN ===
app.post('/auth/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const sql = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(sql, [username.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }

    const payload = {
      user: { id: user.id, username: user.username, role: user.role }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login berhasil', token });
  } catch (err) {
    next(err);
  }
});

// === MOVIES (CRUD PostgreSQL) ===
app.get('/movies', async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year,
           d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    ORDER BY m.id ASC
  `;

  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/movies/:id', async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year,
           d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    WHERE m.id = $1
  `;

  try {
    const result = await db.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Film tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/movies', authenticateToken, async (req, res, next) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year) {
    return res.status(400).json({
      error: 'title, director_id, dan year wajib diisi'
    });
  }

  const sql =
    'INSERT INTO movies (title, director_id, year) VALUES ($1, $2, $3) RETURNING *';

  try {
    const result = await db.query(sql, [title, director_id, year]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.put(
  '/movies/:id',
  [authenticateToken, authorizeRole('admin')],
  async (req, res, next) => {
    const { title, director_id, year } = req.body;

    const sql =
      'UPDATE movies SET title = $1, director_id = $2, year = $3 WHERE id = $4 RETURNING *';

    try {
      const result = await db.query(sql, [
        title,
        director_id,
        year,
        req.params.id
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Film tidak ditemukan' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

app.delete(
  '/movies/:id',
  [authenticateToken, authorizeRole('admin')],
  async (req, res, next) => {
    const sql = 'DELETE FROM movies WHERE id = $1 RETURNING *';

    try {
      const result = await db.query(sql, [req.params.id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Film tidak ditemukan' });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// === DIRECTORS ROUTES (TUGAS PRAKTIKUM DI BAB 3) ===
// kamu isi nanti

// === FALLBACK ===
app.use((req, res) => {
  res.status(404).json({ error: 'Rute tidak ditemukan' });
});

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

// === START SERVER ===
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});




// require('dotenv').config();
// const cors = require('cors');
// const express = require('express');
// const { dbDirectors } = require('./database.js');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const JWT_SECRET = process.env.JWT_SECRET
// const authenticateToken = require('./middleware/authMiddleware');
// const app = express();
// const port = process.env.PORT || 3300;
// app.use(cors());
// // const port = 3100;

// //middleware data
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// let directors = [
//     { id: 1, name: "Don Hall", birthYear: 1980},
//     { id: 2, name: "Jon Watts", birthYear: 1985},
//     { id: 3, name: "Pete Docter", birthYear: 1990},

// ];

// // let movies = [
// //   { id: 1, title: "Moana", director: "Don Hall", year: 2016 },
// //   { id: 2, title: "Spiderman", director: "Jon Watts", year: 2018 },
// //   { id: 3, title: "Inside Out", director: "Pete Docter", year: 2015 }
// // ];

//     app.get('/status', (req, res) => {
//         res.json({
//             status: 'OK',
//             message: 'Server is running',
//             timestamp: new Date()
//         });
//     }
// );

// app.get('/directors', (req, res) => {
//     const sql = "SELECT * FROM directors ORDER BY id ASC";
//     dbDirectors.all(sql, [], (err, rows) => {
//         if (err) {
//             return res.status(400).json({"error": err.message});
//         }
//         res.json(rows);
//     });
// });

// app.get('/directors/:id', (req, res) => {
//     const sql = "SELECT * FROM directors WHERE id = ?";
//     const id = Number(req.params.id);

//     dbDirectors.get(sql, [id], (err, row) => {
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }
//         if (row) {
//             res.json(row);
//         } else {
//             res.status(404).json({ error: 'Film tidak ditemukan' });
//         }
//     });
// });


// app.post('/directors',authenticateToken, (req, res) => {
//     const { name, birthYear } = req.body;
//     if (!name || !birthYear) {
//         return res.status(400).json({ error: `name, birthYear is required`});
//     }
//     const sql =  'INSERT INTO directors (name, birthYear) VALUES (?,?)';
//     dbDirectors.run(sql, [name, birthYear], function(err) {
//         if (err) {
//             return res.status(500).json({error: err.message});
//         }
//         res.status(201).json({id: this.lastID, name, birthYear});
//     });
// });

// app.put('/directors/:id',authenticateToken, (req, res) => {
//     const { name, birthYear } = req.body;
//     const id = Number(req.params.id);

//     if (!name || !birthYear) {
//         return res.status(400).json({ error: 'name and birthYear are required' });
//     }

//     const sql = 'UPDATE directors SET name = ?, birthYear = ? WHERE id = ?';
//     dbDirectors.run(sql, [name, birthYear, id], function(err) { 
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }
//         if (this.changes === 0) {
//             return res.status(404).json({ error: "directors tidak ditemukan" });
//         }
//         res.json({ id, name, birthYear });
//     });
// });

// app.delete('/directors/:id',authenticateToken
//     , (req, res) => {
//     const sql = 'DELETE FROM directors WHERE id = ?';
//     const id = Number(req.params.id);

//     dbDirectors.run(sql, id, function(err) {
//         if (err) {
//             return res.status(500).json({error: err.message});
//         }
//         if (this.changes === 0) {
//             return res.status(400).json({error: "Directors tidak ditemukan"});
//         }
//         res.status(204).send();
//     });
// });



//     app.get('/', (req,res) => {
//    res.send('Selamat Datang diserver Node.js')
//     });

//     app.get('/status', (req, res) => {
//         res.json({
//             status: 'OK',
//             message: 'Server is running',
//             timestamp: new Date()
//         });
//     }
// );

// app.post('/auth/register', (req, res) => {
//     const {username, password} = req.body;
//     if (!username || !password || password.length < 6) {
//         return res.status(400).json({ error: 'username dan password (min 6 char) harus diisi'});
//     }

//     bcrypt.hash(password, 10, (err, hashedPassword) => {
//         if (err) {
//             console.error("Error hashing:", err);
//             return res.status(500).json({ error: 'Gagal memproses pendaftaran'});
//         }

//         const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
//         const params = [username.toLowerCase(), hashedPassword];
        
//         dbDirectors.run(sql, params, function(err) {
//             if (err) {
//                 if (err.message.includes('UNIQUE constraint')) {
//                     return res.status(409).json({ error: 'username sudah digunakan'});
//                 }
//                 console.error("Error inserting user:", err);
//                 return res.status(500),json({ error: 'Gagal menyimpan pengguna'});
//             }
//             res.status(201).json({message: 'Registrasi berhasil', userId: this.lastID});
//         });
//     });
// });


// // app.get('/movies', (req, res) => {
// //     const sql = "SELECT * FROM movies ORDER BY id ASC";
// //     dbMovies.all(sql, [], (err, rows) => {
// //         if (err) {
// //             return res.status(400).json({"error": err.message});
// //         }
// //         res.json(rows);
// //     });
// // });

// // app.get('/movies/:id', (req, res) => {
// //     const sql = "SELECT * FROM movies WHERE id = ?";
// //     const id = Number(req.params.id);

// //     dbMovies.get(sql, [id], (err, row) => {
// //         if (err) {
// //             return res.status(500).json({ error: err.message });
// //         }
// //         if (row) {
// //             res.json(row);
// //         } else {
// //             res.status(404).json({ error: 'Film tidak ditemukan' });
// //         }
// //     });
// // });

// app.post('/auth/login', (req, res) => {
//     const{username, password} = req.body;
//     if (!username || !password) {
//         return res.status(400).json({error: 'username dan password harus diisi'});
//     }
//     const sql = "SELECT * FROM users WHERE username = ?";
//     dbDirectors.get(sql, [username.toLowerCase()], (err, user) => {
//         if (err || !user) {
//             return res.status(401).json({error: 'Kredensial tidak valid'});
//         }

//         bcrypt.compare (password, user.password, (err, isMatch) => {
//             if (err || !isMatch) {
//                 return res.status(401).json({error: 'Kredensial tidak valid'});
//             }

//             const payload = {user: { id: user.id, username: user.username} };

//             jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
//                 if (err) {
//                     console.error("Error signing token:", err);
//                     return res.status(500).json({ error: 'Gagal membuat token' });
//                 }
//                 res.json({ message: 'Login berhasil', token: token});
//             });   
//         });
//     });
// });

// // app.post('/movies', authenticateToken, (req, res) => {
// //     console.log('Request POST/movies oleh user:', req.user.username);
// //     const { title, director, year } = req.body;
// //     if (!title || !director || !year) {
// //         return res.status(400).json({ error: `title,director,year is required`});
// //     }
// //     const sql =  'INSERT INTO movies (title, director, year) VALUES (?,?,?)';
// //     dbMovies.run(sql, [title, director, year], function(err) {
// //         if (err) {
// //             return res.status(500).json({error: err.message});
// //         }
// //         res.status(201).json({id: this.lastID, title, director, year});
// //     });
// // });

// // app.put('/movies/:id', authenticateToken, (req, res) => {
// //     const { title, director, year } = req.body;
// //     const id = Number(req.params.id);

// //     if (!title || !director || !year) {
// //         return res.status(400).json({ error: 'title, director, year are required' });
// //     }

// //     const sql = 'UPDATE movies SET title = ?, director = ?, year = ? WHERE id = ?';
// //     dbMovies.run(sql, [title, director, year, id], function(err) {
// //         if (err) {
// //             return res.status(500).json({ error: err.message });
// //         }
// //         if (this.changes === 0) {
// //             return res.status(404).json({ error: "Film tidak ditemukan" });
// //         }
// //         res.json({ id, title, director, year });
// //     });
// // });

// // app.delete('/movies/:id', authenticateToken, (req, res) => {
// //     const sql = 'DELETE FROM movies WHERE id = ?';
// //     const id = Number(req.params.id);

// //     dbMovies.run(sql, id, function(err) {
// //         if (err) {
// //             return res.status(500).json({error: err.message});
// //         }
// //         if (this.changes === 0) {
// //             return res.status(400).json({error: "Film tidak ditemukan"});
// //         }
// //         res.status(204).send();
// //     });
// // });


// //    app.get('/directors', (req, res) => {
// //     res.json(directors);
// //  });


// //  app.get('/directors/:id', (req, res) => {
// //      const director = directors.find(d => d.id === parseInt(req.params.id));
// //      if (director) {
// //          res.json(director);
// //      } else {
// //          res.status(404).send('Director not found');
// //      }
// //  });

// //  app.post('/directors',authenticateToken, (req, res) => {
// //      const {name, birthYear} = req.body || {};
// //      if (!name || !birthYear) {
// //          return res.status(400).json({error: 'name, birthYear wajib diisi'});
// //      }
// //      const newDirectors = {id: directors.length +1, name, birthYear};
// //      directors.push(newDirectors);
// //      res.status(201).json(newDirectors);
// // });

// // app.post('/directors', authenticateToken, (req, res) => {
// //     const { name, birthYear } = req.body;
// //     const sql = "INSERT INTO directors (name, birthYear) VALUES (?, ?)";
// //     dbDirectors.run(sql, [name, birthYear], function(err) {
// //         if (err) return res.status(400).json({ error: err.message });
// //         res.status(201).json({ id: this.lastID, name, birthYear });
// //     });
// // });

// // app.put('/directors/:id',authenticateToken, (req, res) => {
// //      const id = Number(req.params.id);
// //      const directorIndex = directors.findIndex(d => d.id === id);
// //      if (directorIndex === -1) {
// //          return res.status(404).json({error: 'Director tidak ditemukan'});
// //      }
// //      const{name, birthYear} = req.body || {};
// //      const updatedDirector = {id, name, birthYear};
// //      directors[directorIndex] = updatedDirector;
// //      res.json(updatedDirector);
// // });

// // app.delete('/directors/:id',authenticateToken, (req, res) => {
// //      const id = Number(req.params.id);
// //      const directorIndex = directors.findIndex(d =>  d.id === id);
// //      if (directorIndex === -1) {
// //          return res.status(404).json({error: 'Directors tidak ditemukan'});
// //      }
// //      directors.splice(directorIndex, 1);
// //      res.status(204).send();
// //  });

// //  app.use((req, res) => {
// //     res.status(404).json({error: "Route not found"});
// // });

// // app.listen(port, () => {
// //      console.log(`Server Running on localhost: ${port}`);
// //  });



// // //dummy data



// // app.get('/', (req,res) => {
// //     res.send('Selamat Datang diserver Node.js')

// // });

// // app.get('/movies', (req, res) => {
// //     res.json(movies);
// // });

// // app.get('/movies/:id', (req, res) => {
// //     const movie = movies.find(m => m.id === parseInt(req.params.id));
// //     if (movie) {
// //         res.json(movie);
// //     } else {
// //         res.status(404).send('Movie not found');
// //     }
// // });

// // app.post('/movies', (req, res) => {
// //     const {title, director, year} = req.body || {};
// //     if (!title || !director || !year) {
// //         return res.status(400).json({error: 'title, director, year wajib diisi'});
// //     }
// //     const newMovie = {id: movies.length +1, title, director, year};
// //     movies.push(newMovie);
// //     res.status(201).json(newMovie);
// // });

// // app.put('/movies/:id', (req, res) => {
// //     const id = Number(req.params.id);
// //     const movieIndex = movies.findIndex(m => m.id === id);
// //     if (movieIndex === -1) {
// //         return res.status(404).json({error: 'Movie tidak ditemukan'});
// //     }
// //     const{title, director, year} = req.body || {};
// //     const updatedMovie = {id, title, director, year};
// //     movies[movieIndex] = updatedMovie;
// //     res.json(updatedMovie);
// // });

// // app.delete('/movies/:id', (req, res) => {
// //     const id = Number(req.params.id);
// //     const movieIndex = movies.findIndex(m =>  m.id === id);
// //     if (movieIndex === -1) {
// //         return res.status(404).json({error: 'Movie tidak ditemukan'});
// //     }
// //     movies.splice(movieIndex, 1);
// //     res.status(204).send();
// // })

// app.listen(port, () => {
//     console.log(`Server Running on ${port}`);
// });