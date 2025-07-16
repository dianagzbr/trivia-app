let currentQuestion = {};
let score = 0;
let timeLeft = 60; // 1 minuto para todo el juego
let timer;
let username = '';
let currentQuestionIndex = 0;
let questions = [];

// Cargar el ranking al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada, cargando ranking...');
    loadLeaderboard();
});

function saveUsername() {
    username = document.getElementById('username').value.trim();
    if (username === '') {
        alert('Por favor, ingresa tu nombre');
        return;
    }
    console.log('Nombre guardado:', username);
    document.getElementById('name-selector').style.display = 'none';
    document.getElementById('category-selector').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('cloud-resources').style.display = 'flex';
    loadLeaderboard();
}

async function startGame() {
    console.log('Iniciando juego...');
    document.getElementById('category-selector').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('cloud-resources').style.display = 'flex';
    score = 0;
    timeLeft = 60;
    currentQuestionIndex = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('timer').textContent = timeLeft;
    await fetchQuestions();
    fetchQuestion();
    startTimer();
    loadLeaderboard();
}

async function fetchQuestions() {
    const category = document.getElementById('category').value;
    const url = category === 'all' ? '/api/questions' : `/api/questions?category=${encodeURIComponent(category)}`;
    console.log('Petición a:', url);
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json; charset=utf-8' }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        questions = await response.json();
        // Barajar las preguntas
        questions.sort(() => Math.random() - 0.5);
        console.log('Preguntas cargadas y barajadas:', questions);
        if (questions.length === 0) {
            alert('No hay preguntas disponibles para esta categoría');
            restartGame();
        }
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        alert('Error al cargar preguntas');
        restartGame();
    }
}

function fetchQuestion() {
    if (questions.length === 0) {
        console.error('No hay preguntas disponibles');
        endGame();
        return;
    }
    if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = 0; // Reiniciar si se acaban las preguntas
    }
    currentQuestion = questions[currentQuestionIndex];
    console.log('Pregunta actual:', currentQuestion);
    if (!currentQuestion) {
        alert('No hay preguntas disponibles');
        endGame();
        return;
    }
    displayQuestion();
}

function decodeHtml(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function displayQuestion() {
    console.log('Mostrando pregunta (sin decodificar):', currentQuestion.question);
    const decodedQuestion = decodeHtml(currentQuestion.question);
    console.log('Mostrando pregunta (decodificada):', decodedQuestion);
    document.getElementById('question').innerHTML = decodedQuestion;
    const answers = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
    answers.sort(() => Math.random() - 0.5); // Barajar respuestas
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    answers.forEach(answer => {
        const decodedAnswer = decodeHtml(answer);
        console.log('Mostrando respuesta:', decodedAnswer);
        const button = document.createElement('button');
        button.innerHTML = decodedAnswer;
        button.className = 'w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200';
        button.onclick = () => checkAnswer(answer);
        answersDiv.appendChild(button);
    });
    // Añadir botón de "Pasar"
    const passButton = document.createElement('button');
    passButton.innerHTML = 'Pasar';
    passButton.className = 'w-full p-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors duration-200';
    passButton.onclick = passQuestion;
    answersDiv.appendChild(passButton);
}

function startTimer() {
    timeLeft = 60;
    document.getElementById('timer').textContent = timeLeft;
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

function checkAnswer(selected) {
    console.log('Respuesta seleccionada:', selected);
    if (selected === currentQuestion.correct_answer) {
        score += 10;
        document.getElementById('score').textContent = score;
    }
    currentQuestionIndex++;
    fetchQuestion();
}

function passQuestion() {
    console.log('Pasando pregunta...');
    currentQuestionIndex++;
    fetchQuestion();
}

async function endGame() {
    clearInterval(timer);
    document.getElementById('game').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('cloud-resources').style.display = 'flex';
    document.getElementById('final-score').textContent = score;
    await saveScore(score);
    await loadLeaderboard();
    showUserPosition();
}

function restartGame() {
    document.getElementById('result').style.display = 'none';
    document.getElementById('name-selector').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('cloud-resources').style.display = 'flex';
    document.getElementById('username').value = '';
    username = '';
    loadLeaderboard();
}

function shareScore() {
    const text = `¡"${username}" obtuvo ${score} puntos en el Juego de Trivia! 🎉 Juega en https://trivia-app-production-59b5.up.railway.app/`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
}

async function saveScore(score) {
    console.log('Guardando puntuación:', { username, score });
    await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ username, score })
    });
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/scores', {
            headers: { 'Accept': 'application/json; charset=utf-8' }
        });
        const scores = await response.json();
        console.log('Puntuaciones cargadas:', scores);
        const leaderboardElements = document.querySelectorAll('#leaderboard');
        leaderboardElements.forEach(leaderboard => {
            leaderboard.innerHTML = scores.map((s, index) => {
                const isUserScore = s.username === username && s.score === score;
                return `<li class="${isUserScore ? 'bg-yellow-200 border-2 border-yellow-600 animate-pulse' : index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} p-2 rounded-md shadow-sm">${decodeHtml(s.username)}: ${s.score} puntos</li>`;
            }).join('');
        });
    } catch (error) {
        console.error('Error cargando ranking:', error);
    }
}

async function showUserPosition() {
    try {
        const response = await fetch('/api/scores', {
            headers: { 'Accept': 'application/json; charset=utf-8' }
        });
        const scores = await response.json();
        const userScore = scores.find(s => s.username === username && s.score === score);
        if (userScore) {
            const position = scores.sort((a, b) => b.score - a.score).findIndex(s => s.username === username && s.score === score) + 1;
            document.getElementById('user-position').innerHTML = `Tu posición: #${position}`;
        } else {
            document.getElementById('user-position').innerHTML = 'Tu puntuación no se encontró en el ranking';
        }
    } catch (error) {
        console.error('Error mostrando posición:', error);
    }
}