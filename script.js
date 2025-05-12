document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Screen dimensions
    const SCREEN_WIDTH = 288;
    const SCREEN_HEIGHT = 512;
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;

    // Colors
    const WHITE = "#FFFFFF";
    const BLACK = "#000000";
    // const BLUE = "#0000FF"; // Background is set by CSS
    const GREEN = "#00FF00";
    const RED = "#FF0000";
    const BIRD_COLOR = RED; // Bird color from Pygame
    const PIPE_COLOR = GREEN; // Pipe color from Pygame
    const BASE_COLOR = BLACK; // Base color from Pygame

    // Bird settings
    const bird_radius = 15;
    let bird_x = 50;
    let bird_y = SCREEN_HEIGHT / 2;
    let bird_y_change = 0;

    // Pipe settings
    const PIPE_WIDTH = 50;
    // const PIPE_HEIGHT = SCREEN_HEIGHT; // Not explicitly needed for drawing like this
    const pipe_gap = 155;
    let pipe_x = SCREEN_WIDTH;

    // Define initial positions for the pipes (gap start y)
    // These values determine the y-coordinate of the bottom edge of the top pipe
    let pipe_y_top_val = Math.floor(Math.random() * (50 - 25 + 1)) + 25; // Random top pipe height of 25 to 50
    let pipe_y_middle_val = (SCREEN_HEIGHT / 2) - (pipe_gap / 2);
    let pipe_y_bottom_val = pipe_y_middle_val + Math.floor((SCREEN_HEIGHT / 2 - pipe_y_middle_val) * 2 / 3);
    
    const pipe_position_cycle = [pipe_y_top_val, pipe_y_bottom_val, pipe_y_middle_val];
    let pipe_position_index = 0;
    let current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];

    // Base settings
    const BASE_HEIGHT = 20;
    const base_y = SCREEN_HEIGHT - BASE_HEIGHT;

    // Game settings
    const gravity = 0.5;
    const flap_strength = -8; // Adjusted for smoother feel
    const scroll_speed = 3;
    let score = 0;
    const FONT_SIZE = 55;
    const FONT_FAMILY = "Arial"; // Or SysFont equivalent like 'Consolas', 'Courier New'

    // Game state
    let gameRunning = false;
    let gameOver = false;
    let paused = false;

    // DOM Elements for messages
    const scoreDisplay = document.getElementById('scoreDisplay');
    const startMessage = document.getElementById('startMessage');
    const pausedMessage = document.getElementById('pausedMessage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreSpan = document.getElementById('finalScore');


    function drawBackground() {
        // Background color is set by CSS on the canvas element
        // If you want to draw it dynamically:
        // ctx.fillStyle = "#70c5ce"; // Light blue
        // ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    function drawBird(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, bird_radius, 0, Math.PI * 2);
        ctx.fillStyle = BIRD_COLOR;
        ctx.fill();
        ctx.closePath();
    }

    function drawPipe(x, gap_start_y, gap_size) {
        ctx.fillStyle = PIPE_COLOR;
        // Upper pipe
        ctx.fillRect(x, 0, PIPE_WIDTH, gap_start_y);
        // Lower pipe
        ctx.fillRect(x, gap_start_y + gap_size, PIPE_WIDTH, SCREEN_HEIGHT - (gap_start_y + gap_size) - BASE_HEIGHT);
    }

    function drawBase() {
        ctx.fillStyle = BASE_COLOR;
        ctx.fillRect(0, base_y, SCREEN_WIDTH, BASE_HEIGHT);
    }

    function drawScore(currentScore) {
        scoreDisplay.textContent = `Score: ${currentScore}`; // Update HUD score
        
        // Draw score on canvas (like Pygame)
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const scoreText = String(currentScore);
        const textWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, (SCREEN_WIDTH / 2) - (textWidth / 2), 70);
    }

    function checkCollision(b_x, b_y, b_radius, p_x, p_gap_start_y, p_width, p_gap_size) {
        // Check collision with pipes
        if (b_x + b_radius > p_x && b_x - b_radius < p_x + p_width) {
            // Bird is horizontally aligned with the pipe
            if (b_y - b_radius < p_gap_start_y || b_y + b_radius > p_gap_start_y + p_gap_size) {
                // console.log("Hit pipe");
                return true; // Collision with pipe
            }
        }

        // Check collision with ground
        if (b_y + b_radius > base_y) {
            // console.log("Hit ground");
            return true;
        }

        // Check collision with ceiling
        if (b_y - b_radius < 0) {
            // console.log("Hit ceiling");
            return true;
        }
        return false;
    }
    
    function resetGame() {
        bird_y = SCREEN_HEIGHT / 2;
        bird_y_change = 0;
        pipe_x = SCREEN_WIDTH;
        
        // Re-randomize pipe cycle starts if desired, or keep them from initial load
        pipe_y_top_val = Math.floor(Math.random() * (50 - 25 + 1)) + 25;
        pipe_y_middle_val = (SCREEN_HEIGHT / 2) - (pipe_gap / 2);
        pipe_y_bottom_val = pipe_y_middle_val + Math.floor((SCREEN_HEIGHT / 2 - pipe_y_middle_val) * 2 / 3);
        pipe_position_cycle[0] = pipe_y_top_val;
        pipe_position_cycle[1] = pipe_y_bottom_val;
        pipe_position_cycle[2] = pipe_y_middle_val;

        pipe_position_index = 0;
        current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
        
        score = 0;
        gameOver = false;
        paused = false;
        gameRunning = true;

        startMessage.style.display = 'none';
        pausedMessage.style.display = 'none';
        gameOverMessage.style.display = 'none';
    }

    function gameLoop() {
        if (!gameRunning && !gameOver) {
            // Initial state or after a game over, waiting to start
            drawBackground(); // Clear canvas essentially
            drawBase();
            drawBird(bird_x, bird_y); // Show bird at start position
            startMessage.style.display = 'block';
            requestAnimationFrame(gameLoop);
            return;
        }
        
        if (paused) {
            pausedMessage.style.display = 'block';
            // Optionally draw current game state while paused
            // drawBackground();
            // drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
            // drawBase();
            // drawBird(bird_x, bird_y);
            // drawScore(score);
            requestAnimationFrame(gameLoop); // Keep listening for unpause
            return;
        } else {
            pausedMessage.style.display = 'none';
        }

        if (gameOver) {
            finalScoreSpan.textContent = score;
            gameOverMessage.style.display = 'block';
            // Optionally draw final game state
            // drawBackground();
            // drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
            // drawBase();
            // drawBird(bird_x, bird_y); // Show bird at collision point
            // drawScore(score);
            requestAnimationFrame(gameLoop); // Keep listening for restart
            return;
        }

        // Bird movement
        bird_y_change += gravity;
        bird_y += bird_y_change;

        // Pipe movement
        pipe_x -= scroll_speed;
        if (pipe_x < -PIPE_WIDTH) {
            pipe_x = SCREEN_WIDTH;
            pipe_position_index = (pipe_position_index + 1) % pipe_position_cycle.length;
            current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
            score += 1;
        }

        // Check for collisions
        if (checkCollision(bird_x, bird_y, bird_radius, pipe_x, current_pipe_gap_start_y, PIPE_WIDTH, pipe_gap)) {
            gameOver = true;
            gameRunning = false; // Stop active game updates
        }

        // Drawing everything
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT); // Clear canvas
        drawBackground(); // Redraw background if it's dynamic
        drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
        drawBase();
        drawBird(bird_x, bird_y);
        drawScore(score);

        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === ' ') {
            event.preventDefault(); // Prevent spacebar from scrolling
            if (!gameRunning && !gameOver) { // Start game
                resetGame(); // This sets gameRunning to true
            } else if (gameOver) { // Restart game
                resetGame();
            } else if (gameRunning && !paused) { // Flap
                bird_y_change = flap_strength;
            }
        } else if ((event.key === 'p' || event.key === 'P') && gameRunning && !gameOver) {
            paused = !paused;
        }
    });
    
    // Start the initial "waiting" loop
    gameLoop();
});
