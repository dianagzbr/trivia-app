const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Función para corregir codificación Windows-1252 a UTF-8
function fixEncoding(str) {
    if (!str) return str;
    const win1252ToUtf8 = {
        '\x80': '€', '\x82': '‚', '\x83': 'ƒ', '\x84': '„', '\x85': '…', '\x86': '†', '\x87': '‡',
        '\x88': 'ˆ', '\x89': '‰', '\x8A': 'Š', '\x8B': '‹', '\x8C': 'Œ', '\x8E': 'Ž', '\x91': '‘',
        '\x92': '’', '\x93': '“', '\x94': '”', '\x95': '•', '\x96': '–', '\x97': '—', '\x98': '˜',
        '\x99': '™', '\x9A': 'š', '\x9B': '›', '\x9C': 'œ', '\x9E': 'ž', '\x9F': 'Ÿ', '\xA1': '¡',
        '\xA3': '£', '\xA8': '¨', '\xA9': '©', '\xAA': 'ª', '\xAB': '«', '\xAD': '­', '\xAE': '®',
        '\xB0': '°', '\xB1': '±', '\xB5': 'µ', '\xBA': 'º', '\xBB': '»', '\xBF': '¿', '\xC0': 'À',
        '\xC1': 'Á', '\xC2': 'Â', '\xC3': 'Ã', '\xC4': 'Ä', '\xC5': 'Å', '\xC7': 'Ç', '\xC8': 'È',
        '\xC9': 'É', '\xCA': 'Ê', '\xCB': 'Ë', '\xCC': 'Ì', '\xCD': 'Í', '\xCE': 'Î', '\xCF': 'Ï',
        '\xD1': 'Ñ', '\xD2': 'Ò', '\xD3': 'Ó', '\xD4': 'Ô', '\xD5': 'Õ', '\xD6': 'Ö', '\xD8': 'Ø',
        '\xD9': 'Ù', '\xDA': 'Ú', '\xDB': 'Û', '\xDC': 'Ü', '\xDD': 'Ý', '\xDF': 'ß', '\xE0': 'à',
        '\xE1': 'á', '\xE2': 'â', '\xE3': 'ã', '\xE4': 'ä', '\xE5': 'å', '\xE7': 'ç', '\xE8': 'è',
        '\xE9': 'é', '\xEA': 'ê', '\xEB': 'ë', '\xEC': 'ì', '\xED': 'í', '\xEE': 'î', '\xEF': 'ï',
        '\xF1': 'ñ', '\xF2': 'ò', '\xF3': 'ó', '\xF4': 'ô', '\xF5': 'õ', '\xF6': 'ö', '\xF8': 'ø',
        '\xF9': 'ù', '\xFA': 'ú', '\xFB': 'û', '\xFC': 'ü', '\xFD': 'ý', '\xFF': 'ÿ'
    };
    return str.replace(/[\x80-\xFF]/g, char => win1252ToUtf8[char] || char);
}

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Forzar codificación UTF-8 en la conexión
pool.on('connect', client => {
    client.query('SET client_encoding TO UTF8')
        .then(() => console.log('Codificación cliente establecida a UTF8'))
        .catch(err => console.error('Error estableciendo codificación:', err));
});

// Crear tabla de puntuaciones
pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error('Error creando tabla scores:', err));

// Crear tabla de preguntas
pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        incorrect_answers TEXT[] NOT NULL
    )
`).catch(err => console.error('Error creando tabla questions:', err));

// Endpoint para guardar puntuaciones
app.post('/api/scores', async (req, res) => {
    const { username, score } = req.body;
    try {
        await pool.query('INSERT INTO scores (username, score) VALUES ($1, $2)', [username, score]);
        res.status(201).send('Puntuación guardada');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar puntuación');
    }
});

// Endpoint para obtener las mejores puntuaciones
app.get('/api/scores', async (req, res) => {
    try {
        const result = await pool.query('SELECT username, score, created_at FROM scores ORDER BY score DESC LIMIT 10');
        const fixedScores = result.rows.map(row => ({
            ...row,
            username: fixEncoding(row.username)
        }));
        console.log('Puntuaciones enviadas:', fixedScores);
        res.json(fixedScores);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener puntuaciones');
    }
});

// Endpoint para obtener preguntas por categoría
app.get('/api/questions', async (req, res) => {
    const { category } = req.query;
    try {
        let query = 'SELECT * FROM questions';
        let values = [];
        if (category && category !== 'all') {
            query += ' WHERE category = $1';
            values = [category];
        }
        const result = await pool.query(query, values);
        const fixedQuestions = result.rows.map(row => ({
            ...row,
            category: fixEncoding(row.category),
            question: fixEncoding(row.question),
            correct_answer: fixEncoding(row.correct_answer),
            incorrect_answers: row.incorrect_answers.map(fixEncoding)
        }));
        console.log('Preguntas enviadas:', fixedQuestions);
        res.json(fixedQuestions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener preguntas');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));