// game2.js - Controles y eventos del juego

// Variables para control táctil
let touchStartX = null;
let touchStartY = null;
let lastTap = 0;
let touchTimeout = null;
const SWIPE_THRESHOLD = 30;
let isTouchMoving = false;
let touchStartTime = 0;

// Funciones de juego
function checkLines() {
    let linesCleared = 0;
    for(let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if(board[y].every(value => value)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            lines++;
        }
    }
    
    if(linesCleared > 0) {
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
        
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = setInterval(update, Math.max(100, 1000 - (level * 50)));
        }
    }
}

function update() {
    if (isPaused || gameOver) return;
    
    currentPiece.y++;
    if(collision(currentPiece, board)) {
        currentPiece.y--;
        mergePiece();
        checkLines();
        
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        
        if(collision(currentPiece, board)) {
            gameOver = true;
            clearInterval(gameLoop);
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('finalScore').textContent = score;
        }
    }
    draw();
}

function draw() {
    drawBoard();
    if (!gameOver && !isPaused) {
        drawPiece(currentPiece, ctx);
    }
}

// Funciones de control
function moveLeft() {
    if (gameOver || isPaused) return;
    currentPiece.x--;
    if (collision(currentPiece, board)) {
        currentPiece.x++;
    }
    draw();
}

function moveRight() {
    if (gameOver || isPaused) return;
    currentPiece.x++;
    if (collision(currentPiece, board)) {
        currentPiece.x--;
    }
    draw();
}

function moveDown() {
    if (gameOver || isPaused) return;
    currentPiece.y++;
    if (collision(currentPiece, board)) {
        currentPiece.y--;
    }
    draw();
}

function hardDrop() {
    if (gameOver || isPaused) return;
    while (!collision(currentPiece, board)) {
        currentPiece.y++;
    }
    currentPiece.y--;
    mergePiece();
    checkLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    
    if (collision(currentPiece, board)) {
        gameOver = true;
        clearInterval(gameLoop);
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
    }
    draw();
}

// Eventos táctiles
function handleTouchStart(event) {
    if (gameOver || !gameLoop) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouchMoving = false;

    // Detectar doble tap
    const currentTime = Date.now();
    const tapLength = currentTime - lastTap;
    lastTap = currentTime;

    if (tapLength < 300 && tapLength > 0) {
        hardDrop();
    }

    touchTimeout = setTimeout(() => {
        if (!isTouchMoving) {
            rotatePiece();
            draw();
        }
    }, 200);
}

function handleTouchMove(event) {
    if (gameOver || !gameLoop || !touchStartX || !touchStartY) return;
    
    event.preventDefault();
    clearTimeout(touchTimeout);
    isTouchMoving = true;

    const touch = event.touches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;

    if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (diffX > 0) {
            moveRight();
        } else {
            moveLeft();
        }
        touchStartX = touch.clientX;
    }

    if (diffY > SWIPE_THRESHOLD) {
        moveDown();
        touchStartY = touch.clientY;
    }
}

function handleTouchEnd() {
    clearTimeout(touchTimeout);
    touchStartX = null;
    touchStartY = null;
}

// Reset y control del juego
function resetGame() {
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    isPaused = false;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('score').textContent = '0';
    document.getElementById('level').textContent = '1';
    document.getElementById('lines').textContent = '0';
    
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawBoard();
    drawNextPiece();
    
    gameLoop = setInterval(update, 1000);
    
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'inline-block';
}

// Event Listeners
document.addEventListener('keydown', event => {
    if (gameOver) return;

    switch(event.keyCode) {
        case 37: moveLeft(); break;      // Izquierda
        case 39: moveRight(); break;     // Derecha
        case 40: moveDown(); break;      // Abajo
        case 38: rotatePiece(); draw(); break;  // Rotar
        case 32: hardDrop(); break;      // Espacio
        case 80: // P - Pausar
            isPaused = !isPaused;
            break;
    }
});

// Eventos táctiles
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, false);

// Eventos de botones
document.getElementById('startButton').addEventListener('click', resetGame);
document.getElementById('restartButton').addEventListener('click', resetGame);

// Evento de redimensionamiento
window.addEventListener('resize', () => {
    BLOCK_SIZE = resizeGame();
    draw();
    drawNextPiece();
});

// Inicialización
window.addEventListener('load', () => {
    initBoard();
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
});