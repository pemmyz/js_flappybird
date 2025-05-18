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
    const GREEN = "#00FF00";
    const RED = "#FF0000";
    const BIRD_COLOR = RED;
    const PIPE_COLOR = GREEN;
    const BASE_COLOR = BLACK;

    // Bird settings
    const bird_radius = 15;
    let bird_x = 50;
    let bird_y = SCREEN_HEIGHT / 2;
    let bird_y_change = 0;

    // Pipe settings
    const PIPE_WIDTH = 50;
    const BASE_PIPE_GAP = 155; // Initial pipe gap
    let pipe_gap = BASE_PIPE_GAP; // Current pipe gap, can change with difficulty
    const MIN_PIPE_GAP = bird_radius * 3.5; // Minimum allowed pipe gap

    let pipe_x = SCREEN_WIDTH;

    const pipe_position_cycle = [0, 0, 0]; // Will store the 3 gap start Y options
    let pipe_position_index = 0;
    let current_pipe_gap_start_y;

    // Base settings
    const BASE_HEIGHT = 20;
    const base_y = SCREEN_HEIGHT - BASE_HEIGHT;

    // Game settings
    const gravity = 0.5;
    const flap_strength = -8;
    const scroll_speed = 3;
    let score = 0;
    const FONT_SIZE = 55;
    const FONT_FAMILY = "Arial";

    // Difficulty Settings
    const DIFFICULTIES = {
        NORMAL: 'Normal',
        HARD: 'Hard',
        EXTRA_HARD: 'Extra Hard'
    };
    const DIFFICULTY_CYCLE_VALUES = [DIFFICULTIES.NORMAL, DIFFICULTIES.HARD, DIFFICULTIES.EXTRA_HARD];
    let currentDifficultyIndex = 0; // Default to Normal on page load
    let currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];

    // Game state
    let gameRunning = false;
    let gameOver = false;
    let paused = false;

    // DOM Elements for messages
    const scoreDisplayElement = document.getElementById('scoreDisplay'); // Renamed to avoid conflict if 'scoreDisplay' is used elsewhere
    const startMessage = document.getElementById('startMessage');
    const pausedMessage = document.getElementById('pausedMessage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreSpan = document.getElementById('finalScore');
    const instructionsDiv = document.getElementById('instructions');
    const difficultyDisplayElement = document.getElementById('difficultyDisplayElement');


    function updateDifficultyDisplay() {
        if (difficultyDisplayElement) {
            difficultyDisplayElement.textContent = `Difficulty: ${currentDifficulty} (Press N to change)`;
        }
    }

    function drawBackground() {
        // Background color is set by CSS on canvas
    }

    function drawBird(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, bird_radius, 0, Math.PI * 2);
        ctx.fillStyle = BIRD_COLOR;
        ctx.fill();
        ctx.closePath();
    }

    function drawPipe(x, gap_start_y, current_gap_size) { // Takes current_gap_size
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(x, 0, PIPE_WIDTH, gap_start_y);
        ctx.fillRect(x, gap_start_y + current_gap_size, PIPE_WIDTH, SCREEN_HEIGHT - (gap_start_y + current_gap_size) - BASE_HEIGHT);
    }

    function drawBase() {
        ctx.fillStyle = BASE_COLOR;
        ctx.fillRect(0, base_y, SCREEN_WIDTH, BASE_HEIGHT);
    }

    function updateAndDrawScore(currentScore) {
        scoreDisplayElement.textContent = `Score: ${currentScore}`; // Update DOM score
        // Draw score on canvas
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const scoreText = String(currentScore);
        const textWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, (SCREEN_WIDTH / 2) - (textWidth / 2), 70);
    }

    function checkCollision(b_x, b_y, b_radius, p_x, p_gap_start_y, p_width, current_gap_size) { // Takes current_gap_size
        if (b_x + b_radius > p_x && b_x - b_radius < p_x + p_width) {
            if (b_y - b_radius < p_gap_start_y || b_y + b_radius > p_gap_start_y + current_gap_size) {
                return true;
            }
        }
        if (b_y + b_radius > base_y) return true;
        if (b_y - b_radius < 0) return true; // Hit top of screen
        return false;
    }

    function resetGame() {
        bird_y = SCREEN_HEIGHT / 2;
        bird_y_change = 0;
        pipe_x = SCREEN_WIDTH;
        pipe_gap = BASE_PIPE_GAP; // Reset dynamic pipe_gap for the start of the new game

        // Recalculate reference pipe Y-positions based on BASE_PIPE_GAP
        const playable_area_height = SCREEN_HEIGHT - BASE_HEIGHT;
        const min_pipe_segment_height = bird_radius * 1; // Min height for top/bottom pipe segment visually

        let y_range_start_min = min_pipe_segment_height;
        let y_range_start_max = playable_area_height - BASE_PIPE_GAP - min_pipe_segment_height;

        // Ensure the range is valid (max > min)
        if (y_range_start_min >= y_range_start_max) {
            y_range_start_min = bird_radius * 0.5; // A small positive value
            y_range_start_max = Math.max(y_range_start_min + bird_radius, playable_area_height - BASE_PIPE_GAP - (bird_radius * 0.5));
             if (y_range_start_min >= y_range_start_max) { // Ultimate fallback
                y_range_start_max = y_range_start_min + BASE_PIPE_GAP * 0.1; // ensure max is slightly larger
             }
        }
        
        const y_gap_start_total_range = Math.max(0, y_range_start_max - y_range_start_min);

        // Define 3 distinct positions for the gap start (top of the gap)
        pipe_position_cycle[0] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.25); // Gap relatively high
        pipe_position_cycle[1] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.75); // Gap relatively low
        pipe_position_cycle[2] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.50); // Gap in the middle
        
        // Ensure all values are at least min_pipe_segment_height and allow for full gap + bottom segment
        for(let i=0; i < pipe_position_cycle.length; i++) {
            pipe_position_cycle[i] = Math.max(min_pipe_segment_height, pipe_position_cycle[i]);
            pipe_position_cycle[i] = Math.min(pipe_position_cycle[i], playable_area_height - BASE_PIPE_GAP - min_pipe_segment_height);
        }


        pipe_position_index = Math.floor(Math.random() * pipe_position_cycle.length); // Start at a random pipe position
        current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];

        score = 0;
        gameOver = false;
        paused = false;
        gameRunning = true;

        // Update UI
        startMessage.style.display = 'none';
        pausedMessage.style.display = 'none';
        gameOverMessage.style.display = 'none';
        instructionsDiv.style.display = 'block'; // Show instructions during gameplay
        updateDifficultyDisplay(); // Displays the currently selected difficulty
    }

    function gameLoop() {
        if (!gameRunning && !gameOver) { // Initial "Press Start" screen
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawBackground();
            drawBase();
            drawBird(bird_x, bird_y); // Draw bird in starting position
            updateAndDrawScore(score); // Show initial score (0)

            startMessage.style.display = 'block';
            instructionsDiv.style.display = 'block'; // Show instructions on start screen
            updateDifficultyDisplay();
            requestAnimationFrame(gameLoop);
            return;
        }

        if (paused) {
            pausedMessage.style.display = 'block';
            instructionsDiv.style.display = 'block'; // Keep instructions visible if paused
            // Optionally draw paused state on canvas if desired
            requestAnimationFrame(gameLoop);
            return;
        } else {
            pausedMessage.style.display = 'none';
        }

        if (gameOver) {
            finalScoreSpan.textContent = score;
            gameOverMessage.style.display = 'block';
            instructionsDiv.style.display = 'block'; // Show instructions on game over screen
            updateDifficultyDisplay(); // Show current difficulty for next game
            // The canvas effectively freezes on the game over state here
            requestAnimationFrame(gameLoop);
            return;
        }

        // Game is running
        bird_y_change += gravity;
        bird_y += bird_y_change;

        pipe_x -= scroll_speed;
        if (pipe_x < -PIPE_WIDTH) { // Pipe has passed
            pipe_x = SCREEN_WIDTH;
            pipe_position_index = (pipe_position_index + 1) % pipe_position_cycle.length;
            current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
            score += 1;

            // Adjust pipe_gap based on difficulty
            if (currentDifficulty === DIFFICULTIES.HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 2);
            } else if (currentDifficulty === DIFFICULTIES.EXTRA_HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 5);
            }
        }

        if (checkCollision(bird_x, bird_y, bird_radius, pipe_x, current_pipe_gap_start_y, PIPE_WIDTH, pipe_gap)) {
            gameOver = true;
            gameRunning = false;
        }

        // Drawing
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        drawBackground();
        drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap); // Use dynamic pipe_gap
        drawBase();
        drawBird(bird_x, bird_y);
        updateAndDrawScore(score);

        requestAnimationFrame(gameLoop);
    }

    function performFlapAction() {
        if (!gameRunning && !gameOver) { // Start game
            resetGame();
            bird_y_change = flap_strength; // First flap on start
        } else if (gameOver) { // Restart game
            resetGame();
            bird_y_change = flap_strength; // First flap on restart
        } else if (gameRunning && !paused) { // Flap during game
            bird_y_change = flap_strength;
        }
    }

    // Event Listeners
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === ' ') {
            event.preventDefault();
            performFlapAction();
        } else if ((event.key === 'p' || event.key === 'P') && gameRunning && !gameOver) {
            paused = !paused;
            if (!paused) { // If unpausing
                gameLoop(); // Immediately call gameLoop to resume animation if it was fully stopped by pause
            }
        } else if (event.key === 'n' || event.key === 'N') {
            currentDifficultyIndex = (currentDifficultyIndex + 1) % DIFFICULTY_CYCLE_VALUES.length;
            currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];
            updateDifficultyDisplay();

            // If game is not running (on start/game over screen), reset pipe_gap for next game's start
            // This ensures that if you change difficulty on game over, the *next* game starts with BASE_PIPE_GAP
            // but the difficulty setting (Normal, Hard, Extra Hard) is remembered for that next game.
            if (!gameRunning) {
                pipe_gap = BASE_PIPE_GAP;
            }
        }
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        performFlapAction();
    });

    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        performFlapAction();
    });

    // Initial setup for UI before game starts
    updateDifficultyDisplay();
    startMessage.style.display = 'block';
    instructionsDiv.style.display = 'block';

    gameLoop(); // Start the initial "waiting" or "active" game loop
});
