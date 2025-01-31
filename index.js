const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);

const games = {}; // Store game states by room ID

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinGame', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined game room: ${room}`);

    if (!games[room]) {
      games[room] = {
        players: [socket.id],
        board: Array(9).fill(null), // 3x3 board initialized with null
        currentTurn: 0, // Index of the current player
      };
    } else {
      games[room].players.push(socket.id);
    }

    io.to(room).emit('updateGame', games[room]);

    if (games[room].players.length === 2) {
      io.to(room).emit('message', `Game started!`);
    } else {
      io.to(room).emit('message', `Waiting for another player to join...`);
    }
  });

  socket.on('makeMove', ({ room, index }) => {
    const game = games[room];
    if (!game) return;

    const playerIndex = game.players.indexOf(socket.id);
    if (playerIndex !== game.currentTurn || game.board[index] !== null) return;

    game.board[index] = playerIndex === 0 ? 'X' : 'O';
    game.currentTurn = 1 - game.currentTurn; // Switch turns
    io.to(room).emit('updateGame', game);

    const winner = checkWinner(game.board);
    if (winner) {
      io.to(room).emit('message', `Player ${game.players[winner === 'X' ? 0 : 1]} wins!`);
      delete games[room]; // Reset the game
    } else if (game.board.every((cell) => cell !== null)) {
      io.to(room).emit('message', 'Game ends in a draw!');
      delete games[room]; // Reset the game
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

function checkWinner(board) {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of winningCombinations) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
