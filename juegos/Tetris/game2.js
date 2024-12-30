// game2.js - Controles y eventos del juego

// Variables para control táctil
let touchStartX = null;
let touchStartY = null;
let lastTap = 0;
let touchTimeout = null;
const SWIPE_THRESHOLD = 30;
const TAP_THRESHOLD = 10;
let isTouchMoving = false;
let touchStartTime = 0;
let touchMoveDistance = 0;

// Variables para efectos visuales
let particles = [];
const PARTICLE_COUNT = 15;
const EXPLOSION_DURATION = 500;
let isAnimatingExplosion = false;

// Funciones para efectos visuales
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

function drawScoreText(text, color = '#FFD700') {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Efecto de aparición y desaparición
    let alpha = 1;
    const animate = () => {
        ctx.globalAlpha = alpha;
        // Sombra para efecto 3D
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Dibujar el texto con borde
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        alpha -= 0.02;
        if (alpha > 0) {
            requestAnimationFrame(animate);
        }
    };
    animate();
    ctx.restore();
}

async function animateLineClearing(completedLines) {
    isAnimatingExplosion = true;
    
    // Determinar qué texto mostrar basado en el número de líneas
    let scoreText = '';
    switch(completedLines.length) {
        case 1: scoreText = '1'; break;
        case 2: scoreText = '2'; break;
        case 3: scoreText = '3'; break;
        case 4: scoreText = 'TETRIS!'; break;
    }
    
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
            
            // Mostrar el texto si hay líneas completadas
            if (scoreText) {
                drawScoreText(scoreText);
            }
            
            requestAnimationFrame(animate);
        }
        animate();
    });
}

// Funciones del juego
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
    }
}

async function update() {
    if (isPaused || gameOver || isAnimatingExplosion) return;
    
    currentPiece.y++;
    if(collision(currentPiece, board)) {
        currentPiece.y--;
        mergePiece();
        await checkLines();
        
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        
        if(collision(currentPiece, board)) {
            gameOver = true;
            clearTimeout(gameLoop);
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

// Funciones de movimiento
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

async function hardDrop() {
    if (gameOver || isPaused || isAnimatingExplosion) return;
    while (!collision(currentPiece, board)) {
        currentPiece.y++;
    }
    currentPiece.y--;
    mergePiece();
    await checkLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    
    if (collision(currentPiece, board)) {
        gameOver = true;
        clearTimeout(gameLoop);
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
    }
    draw();
}

// Controles táctiles mejorados
async function handleTouchStart(event) {
    if (gameOver || !gameLoop || isAnimatingExplosion) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    touchMoveDistance = 0;
    isTouchMoving = false;

    const currentTime = Date.now();
    const tapLength = currentTime - lastTap;
    lastTap = currentTime;

    if (tapLength < 300 && tapLength > 0) {
        await hardDrop();
        return;
    }
}

function handleTouchMove(event) {
    if (gameOver || !gameLoop || !touchStartX || !touchStartY || isAnimatingExplosion) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;
    
    touchMoveDistance = Math.sqrt(diffX * diffX + diffY * diffY);
    
    if (touchMoveDistance > SWIPE_THRESHOLD) {
        isTouchMoving = true;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                moveRight();
            } else {
                moveLeft();
            }
            touchStartX = touch.clientX;
        } else if (diffY > SWIPE_THRESHOLD) {
            moveDown();
            touchStartY = touch.clientY;
        }
    }
}

function handleTouchEnd(event) {
    if (gameOver || !gameLoop || isAnimatingExplosion) return;
    
    const touchEndTime = Date.now() - touchStartTime;
    
    if (!isTouchMoving && touchMoveDistance < TAP_THRESHOLD && touchEndTime < 200) {
        rotatePiece();
        draw();
    }
    
    touchStartX = null;
    touchStartY = null;
    isTouchMoving = false;
}

// Reset del juego
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
        clearTimeout(gameLoop);
    }
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawBoard();
    drawNextPiece();
    
    // Usar setTimeout recursivo en lugar de setInterval
    const gameLoopFunction = async () => {
        if (!gameOver && !isPaused) {
            await update();
            gameLoop = setTimeout(gameLoopFunction, Math.max(100, 1000 - (level * 50)));
        }
    };
    gameLoop = setTimeout(gameLoopFunction, 1000);
    
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'inline-block';
}

// Event Listeners
document.addEventListener('keydown', async event => {
    if (gameOver || isAnimatingExplosion) return;

    switch(event.keyCode) {
        case 37: moveLeft(); break;
        case 39: moveRight(); break;
        case 40: moveDown(); break;
        case 38: rotatePiece(); draw(); break;
        case 32: await hardDrop(); break;
        case 80:
            if (!isAnimatingExplosion) {
                isPaused = !isPaused;
            }
            break;
    }
});

// Inicializar controles táctiles
function initTouchControls() {
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}

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
    initTouchControls();
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
});