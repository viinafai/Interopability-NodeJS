const express = require('express');
const app = express();
const port = 3100;

app.use(express.json());
//let idSeq = movies[movies.length - 1].id + 1;

// let movies = [
//     {id: 1, title: 'Avenger', director: 'Peter Jackson', year:2010},
//     {id: 2, title: 'The GodFather', director: 'Francis Ford Coppala', year: 1972},
//     {id: 3, title: 'Spirit Away', director: 'Hayao Mizayaki', year: 2001},
// ];

let directors = [
  { id: 1, name: 'Ava DuVernay', birthYear: 1972 },
  { id: 2, name: 'Hirokazu Kore-eda', birthYear: 1980 },
  { id: 3, name: 'Takeshi Kitano', birthYear: 1988 },
  { id: 4, name: 'Bong Joon-ho', birthYear: 1969 },
  { id: 5, name: 'Park Chan-wook', birthYear: 1963 },
];

// app.get('/', (req, res) => {
//   res.send('Selamat datangg cintaa!');
// });

// app.get('/movies', (req, res) => {
//   res.json(movies);
// });

app.get('/directors', (req, res) => {
  res.json(directors);
});

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });

// app.get('/movies/:id', (req, res) => {
//   const movie = movies.find(m => m.id === parseInt(req.params.id));
//     if (movie) {
//       res.json(movie);
//     } else {
//       res.status(404).send('Movie not found');
//     }
// });

app.get('/directors/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const director = directors.find(d => d.id === id);

  if (!director) {
    return res.status(404).json({error: 'Director Tidak Ditemukan'});
  }

  res.json(director);
});

// POST /movies - Membuat film baru
// app.post('/movies', (req, res) => {
//   const { title, director, year } = req.body || {};
//   if (!title || !director || !year) {
//     return res.status(400).json({ error: 'title, director, year wajib diisi' });
//   }

//   const newMovie = { id: movies.length +1, title, director, year };
//   movies.push(newMovie);
//   res.status(201).json(newMovie);
// });

app.post('/directors', (req, res) => {
  const { name, birthYear } = req.body || {};

  if (!name || !birthYear) {
    return res.status(400).json({error: 'name dan birthYear wajib diisi'});
  }

  const newDirector = {
    id: directors.length ? directors[directors.length -1].id + 1 : 1,
    name,
    birthYear
  };

  directors.push(newDirector);
  res.status(201).json(newDirector);
});

// PUT /movies/:id - Memperbarui data film
// app.put('/movies/:id', (req, res) => {
//   const id = Number(req.params.id);
//   const movieIndex = movies.findIndex(m => m.id === id);

//   if (movieIndex === -1) {
//     return res.status(404).json({ error: 'Movie tidak ditemukan' });
//   }

//   const { title, director, year } = req.body || {};
//   const updatedMovie = { id, title, director, year };
//   movies[movieIndex] = updatedMovie;
//   res.json(updatedMovie);
// });

app.put('/directors/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const directorIndex = directors.findIndex(d => d.id === id);

  if (directorIndex === -1) {
    return res.status(404).json({ error: 'Director tidak ditemukan' });
  }

  const { name, birthYear } = req.body || {};

  if (!name || !birthYear) {
    return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  }

  const updatedDirector = { id, name, birthYear };
  directors[directorIndex] = updatedDirector;
  res.json(updatedDirector);
});

// DELETE /movies/:id - Menghapus film
// app.delete('/movies/:id', (req, res) => {
//   const id = Number(req.params.id);
//   const movieIndex = movies.findIndex(m => m.id === id);

//   if (movieIndex === -1) {
//     return res.status(404).json({ error: 'Movie tidak ditemukan' });
//   }

//   movies.splice(movieIndex, 1);
//   res.status(204).send();
// });


app.delete('/directors/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const directorIndex = directors.findIndex(d => d.id === id);

  if (directorIndex === -1) {
    return res.status(404).json({error: 'Director tidak ditemukan'});
  }

  directors.splice(directorIndex, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log('Server Running on localhost: ${port}');
});