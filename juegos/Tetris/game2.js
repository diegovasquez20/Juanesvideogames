// game2.js - Controles y eventos del juego

// Variables para control táctil
let touchStartX = null;
let touchStartY = null;
let lastTap = 0;
let touchTimeout = null;
const SWIPE_THRESHOLD = 30;
let isTouchMoving = false;
let touchStartTime = 0;

// Variables para efectos visuales
let particles = [];
const PARTICLE_COUNT = 15;
const EXPLOSION_DURATION = 500;
let isAnimatingExplosion = false;

// Funciones para efectos de explosión
function createParticle(x, y, color) {
    return {
        x: x * BLOCK_SIZE + BLOCK_SIZE / 2,
        y: y * BLOCK_SIZE + BLOCK_SIZE / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 1) * 15,
        size: BLOCK_SIZE / 2,
        alpha: 1,
        color: color,
        rotation: Math.random() * Math.PI * 2
    };
}

function createExplosionParticles(y) {
    for(let x = 0; x < BOARD_WIDTH; x++) {
        if(board[y][x]) {
            const color = COLORS[board[y][x] - 1];
            for(let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle(x, y, color));
            }
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Dibujar partícula con efecto de brillo
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        
        // Añadir brillo
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
        gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        
        ctx.restore();

        // Actualizar partícula
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.5;
        particle.alpha *= 0.95;
        particle.rotation += 0.1;
    });
    
    particles = particles.filter(particle => particle.alpha > 0.1);
}

async function animateLineClearing(completedLines) {
    isAnimatingExplosion = true;
    
    completedLines.forEach(y => createExplosionParticles(y));
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const startTime = Date.now();
    
    return new Promise(resolve => {
        function animate() {
            if (Date.now() - startTime > EXPLOSION_DURATION) {
                isAnimatingExplosion = false;
                particles = [];
                resolve();
                return;
            }
            
            drawBoard();
            drawPiece(currentPiece, ctx);
            drawParticles();
            
            requestAnimationFrame(animate);
        }
        animate();
    });
}

// Funciones principales del juego
async function checkLines() {
    let linesCleared = 0;
    const completedLines = [];
    
    for(let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if(board[y].every(value => value)) {
            completedLines.push(y);
            linesCleared++;
            lines++;
        }
    }
    
    if(linesCleared > 0) {
        await animateLineClearing(completedLines);
        
        completedLines.sort((a, b) => b - a).forEach(y => {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
        });
        
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
    if (isPaused || gameOver || isAnimatingExplosion) return;
    
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
    if (gameOver || isPaused || isAnimatingExplosion) return;
    currentPiece.x--;
    if (collision(currentPiece, board)) {
        currentPiece.x++;
    }
    draw();
}

function moveRight() {
    if (gameOver || isPaused || isAnimatingExplosion) return;
    currentPiece.x++;
    if (collision(currentPiece, board)) {
        currentPiece.x--;
    }
    draw();
}

function moveDown() {
    if (gameOver || isPaused || isAnimatingExplosion) return;
    currentPiece.y++;
    if (collision(currentPiece, board)) {
        currentPiece.y--;
    }
    draw();
}

function hardDrop() {
    if (gameOver || isPaused || isAnimatingExplosion) return;
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
    if (gameOver || !gameLoop || isAnimatingExplosion) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouchMoving = false;

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
    if (gameOver || !gameLoop || !touchStartX || !touchStartY || isAnimatingExplosion) return;
    
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
    isAnimatingExplosion = false;
    particles = [];
    
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
    if (gameOver || isAnimatingExplosion) return;

    switch(event.keyCode) {
        case 37: moveLeft(); break;
        case 39: moveRight(); break;
        case 40: moveDown(); break;
        case 38: rotatePiece(); draw(); break;
        case 32: hardDrop(); break;
        case 80: // P - Pausar
            if (!isAnimatingExplosion) {
                isPaused = !isPaused;
            }
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