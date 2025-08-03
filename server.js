
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];
let gameStarted = false;
let traitorId = null;
let mainWord = '';
let fakeWord = '';

const words = JSON.parse(fs.readFileSync('słowa.json'));

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Nowy gracz:', socket.id);

    socket.on('join', (nickname) => {
        if (!gameStarted) {
            players.push({ id: socket.id, nickname });
            io.emit('playersUpdate', players);
        }
    });

    socket.on('startGame', () => {
        if (players.length < 4) return;
        gameStarted = true;

        const traitor = players[Math.floor(Math.random() * players.length)];
        traitorId = traitor.id;

        const randomWords = words.sort(() => 0.5 - Math.random());
        mainWord = randomWords[0];
        fakeWord = randomWords[1];

        players.forEach(player => {
            if (player.id === traitorId) {
                io.to(player.id).emit('yourWord', { word: fakeWord, traitor: true });
            } else {
                io.to(player.id).emit('yourWord', { word: mainWord, traitor: false });
            }
        });
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('playersUpdate', players);
    });
});

server.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});
