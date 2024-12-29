
// Variables del canvas
let canvas = document.getElementById('gameBoard');
let ctx = canvas.getContext('2d');
let nextPieceCanvas = document.getElementById('nextPiece');
let nextPieceCtx = nextPieceCanvas.getContext('2d');
let BLOCK_SIZE;

// Constantes del juego
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = [
    '#ff0000', // Rojo
    '#00ff00', // Verde
    '#0000ff', // Azul
    '#ffff00', // Amarillo
    '#ff00ff', // Magenta
    '#00ffff', // Cian
    '#ffa500'  // Naranja
];

const PIECES = [
    [[1,1,1,1]],           // I
    [[1,1],[1,1]],         // O
    [[1,1,1],[0,1,0]],     // T
    [[1,1,1],[1,0,0]],     // L
    [[1,1,1],[0,0,1]],     // J
    [[1,1,0],[0,1,1]],     // S
    [[0,1,1],[1,1,0]]      // Z
];

// Variables del estado del juego
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let score = 0;
let lines = 0;
let level = 1;
let gameLoop;
let currentPiece;
let nextPiece;
let gameOver = false;
let isPaused = false;

// Funciones de inicialización
function resizeGame() {
    const isMobile = window.innerWidth < 768;
    let maxWidth;
    
    if (isMobile) {
        maxWidth = Math.min(
            window.innerWidth * 0.8, // Reducido a 80%
            window.innerHeight * 0.4  // Reducido a 40%
        );
    } else {
        maxWidth = Math.min(window.innerWidth * 0.25, 250); // Reducido
    }
    
    const BLOCK_SIZE = Math.floor(maxWidth / 10);
    const width = BLOCK_SIZE * 10;
    const height = BLOCK_SIZE * 20;
    
    canvas.width = width;
    canvas.height = height;
    
    // Ajustar tamaño del canvas de siguiente pieza
    const nextPieceSize = Math.min(80, maxWidth * 0.4);
    nextPieceCanvas.width = nextPieceSize;
    nextPieceCanvas.height = nextPieceSize;
    
    return BLOCK_SIZE;
}

function initBoard() {
    BLOCK_SIZE = resizeGame();
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    drawBoard();
}

// Funciones de dibujo mejoradas
function drawBlock(ctx, x, y, color, blockSize = BLOCK_SIZE) {
    const xPos = x * blockSize;
    const yPos = y * blockSize;
    const size = blockSize - 1;
    
    // Color base del bloque
    ctx.fillStyle = COLORS[color];
    ctx.fillRect(xPos, yPos, size, size);
    
    // Efecto de ladrillo
    const gradient = ctx.createLinearGradient(xPos, yPos, xPos + size, yPos + size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(xPos, yPos, size, size);
    
    // Líneas del ladrillo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(xPos, yPos + size/2, size, 1);
    ctx.fillRect(xPos + size/2, yPos, 1, size);
    
    // Borde del bloque
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.strokeRect(xPos, yPos, size, size);
}

function drawBoard() {
    // Fondo del tablero con gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar la cuadrícula tenue
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for(let i = 0; i <= BOARD_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for(let i = 0; i <= BOARD_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // Dibujar bloques
    for(let y = 0; y < BOARD_HEIGHT; y++) {
        for(let x = 0; x < BOARD_WIDTH; x++) {
            if(board[y][x]) {
                drawBlock(ctx, x, y, board[y][x] - 1);
            }
        }
    }
}

function drawPiece(piece, context, offsetX = 0, offsetY = 0, blockSize = BLOCK_SIZE) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if(value) {
                drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, piece.color, blockSize);
            }
        });
    });
}

function drawNextPiece() {
    nextPieceCtx.fillStyle = '#000';
    nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if (!nextPiece) return;
    
    const blockSize = Math.min(
        nextPieceCanvas.width / 4,
        nextPieceCanvas.height / 4
    );
    
    const pieceWidth = nextPiece.shape[0].length;
    const pieceHeight = nextPiece.shape.length;
    
    const offsetX = Math.floor((nextPieceCanvas.width - (pieceWidth * blockSize)) / 2) / blockSize;
    const offsetY = Math.floor((nextPieceCanvas.height - (pieceHeight * blockSize)) / 2) / blockSize;
    
    const tempPiece = {...nextPiece, x: 0, y: 0};
    drawPiece(tempPiece, nextPieceCtx, offsetX, offsetY, blockSize);
}

// Resto de funciones del juego sin cambios
function createPiece() {
    const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    const color = Math.floor(Math.random() * COLORS.length);
    return {
        shape: piece,
        x: Math.floor(BOARD_WIDTH/2) - Math.floor(piece[0].length/2),
        y: 0,
        color: color
    };
}

function collision(piece, board) {
    return piece.shape.some((row, y) => {
        return row.some((value, x) => {
            let newX = piece.x + x;
            let newY = piece.y + y;
            return (
                value &&
                (newX < 0 || newX >= BOARD_WIDTH ||
                 newY >= BOARD_HEIGHT ||
                 (newY >= 0 && board[newY][newX])
                )
            );
        });
    });
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if(value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color + 1;
            }
        });
    });
}

function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[row.length - 1 - i])
    );
    
    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    if(collision(currentPiece, board)) {
        currentPiece.shape = previousShape;
    }
}