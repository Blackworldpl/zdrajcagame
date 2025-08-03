
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let rooms = {};

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
    console.log('Użytkownik połączony:', socket.id);

    socket.on('createRoom', ({ roomId, nickname, mode, rounds }) => {
        rooms[roomId] = {
            host: socket.id,
            players: [{ id: socket.id, nickname, score: 0 }],
            mode,
            rounds,
            words: [],
            currentRound: 0,
            phase: 'waiting',
            guesses: {},
            impostor: null,
            realWord: '',
            fakeWord: '',
        };
        socket.join(roomId);
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
    });

    socket.on('joinRoom', ({ roomId, nickname }) => {
        if (rooms[roomId]) {
            rooms[roomId].players.push({ id: socket.id, nickname, score: 0 });
            socket.join(roomId);
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('submitWord', ({ roomId, word }) => {
        if (rooms[roomId]) {
            rooms[roomId].words.push({ word, playerId: socket.id });
            if (rooms[roomId].words.length === rooms[roomId].players.length) {
                startRound(roomId);
            }
        }
    });

    function startRound(roomId) {
        const room = rooms[roomId];
        const shuffled = shuffle(room.words);
        const chosen = shuffled[0];
        const possibleImpostors = room.players.filter(p => p.id !== chosen.playerId);
        const impostor = shuffle(possibleImpostors)[0];

        room.realWord = chosen.word;
        room.fakeWord = shuffle(room.words.filter(w => w.word !== chosen.word))[0].word;
        room.impostor = impostor.id;
        room.guesses = {};
        room.phase = 'round';

        room.players.forEach(player => {
            const isImpostor = player.id === impostor.id;
            const word = isImpostor ? room.fakeWord : room.realWord;
            io.to(player.id).emit('yourWord', { word, traitor: isImpostor });
        });
    }

    socket.on('vote', ({ roomId, targetId }) => {
        const room = rooms[roomId];
        if (room) {
            room.guesses[socket.id] = targetId;
            if (Object.keys(room.guesses).length === room.players.length) {
                endRound(roomId);
            }
        }
    });

    function endRound(roomId) {
        const room = rooms[roomId];
        room.phase = 'endRound';

        let guessedRight = 0;
        for (const [voter, target] of Object.entries(room.guesses)) {
            if (target === room.impostor) {
                const player = room.players.find(p => p.id === voter);
                if (player) player.score += 1;
                guessedRight++;
            }
        }

        const impostorPlayer = room.players.find(p => p.id === room.impostor);
        if (impostorPlayer && guessedRight === 0) {
            impostorPlayer.score += 2;
        }

        io.to(roomId).emit('roundEnded', {
            impostorId: room.impostor,
            guesses: room.guesses,
            players: room.players,
            realWord: room.realWord
        });

        room.currentRound++;
        if (room.currentRound >= room.rounds) {
            io.to(roomId).emit('gameOver', { players: room.players });
            delete rooms[roomId];
        } else {
            room.words = [];
        }
    }

    socket.on('disconnect', () => {
        console.log('Rozłączono:', socket.id);
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });
});

server.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});
