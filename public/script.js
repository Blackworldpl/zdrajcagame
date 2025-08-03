
const socket = io();
const nickInput = document.getElementById('nick');
const playersList = document.getElementById('players');

function join() {
    const nick = nickInput.value;
    if (nick) {
        socket.emit('join', nick);
    }
}

function start() {
    socket.emit('startGame');
}

socket.on('playersUpdate', (players) => {
    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.nickname;
        playersList.appendChild(li);
    });
});

socket.on('yourWord', ({ word, traitor }) => {
    alert(traitor ? `Jesteś ZDRAJCĄ. Twoje słowo to: ${word}` : `Twoje słowo to: ${word}`);
    window.location.href = 'vote.html';
});
