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
    const BASE_PIPE_GAP = 155;
    let pipe_gap = BASE_PIPE_GAP;
    const MIN_PIPE_GAP = bird_radius * 3.5;

    let pipe_x = SCREEN_WIDTH;

    const pipe_position_cycle = [0, 0, 0];
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
    let currentDifficultyIndex = 0;
    let currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];

    // Game state
    let gameRunning = false;
    let gameOver = false;
    let paused = false;

    // DOM Elements
    const scoreDisplayElement = document.getElementById('scoreDisplay');
    const pipeGapDisplayElement = document.getElementById('pipeGapDisplay');
    const startMessage = document.getElementById('startMessage');
    const pausedMessage = document.getElementById('pausedMessage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreSpan = document.getElementById('finalScore');
    const instructionsDiv = document.getElementById('instructions');
    const difficultyDisplayElement = document.getElementById('difficultyDisplayElement');

    // Onscreen Button Elements
    const flapButton = document.getElementById('flapBtn');
    const pauseButton = document.getElementById('pauseBtn');
    const difficultyButton = document.getElementById('difficultyBtn');


    function updateDifficultyDisplay() {
        if (difficultyDisplayElement) {
            difficultyDisplayElement.textContent = `Difficulty: ${currentDifficulty} (Press N to change)`;
        }
    }

    function updatePipeGapDisplay() {
        if (pipeGapDisplayElement) {
            pipeGapDisplayElement.textContent = `Gate Size: ${Math.round(pipe_gap)}`;
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

    function drawPipe(x, gap_start_y, current_gap_size) {
        ctx.fillStyle = PIPE_COLOR;
        ctx.fillRect(x, 0, PIPE_WIDTH, gap_start_y);
        ctx.fillRect(x, gap_start_y + current_gap_size, PIPE_WIDTH, SCREEN_HEIGHT - (gap_start_y + current_gap_size) - BASE_HEIGHT);
    }

    function drawBase() {
        ctx.fillStyle = BASE_COLOR;
        ctx.fillRect(0, base_y, SCREEN_WIDTH, BASE_HEIGHT);
    }

    function updateAndDrawScore(currentScore) {
        scoreDisplayElement.textContent = `Score: ${currentScore}`;
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const scoreText = String(currentScore);
        const textWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, (SCREEN_WIDTH / 2) - (textWidth / 2), 70);
    }

    function checkCollision(b_x, b_y, b_radius, p_x, p_gap_start_y, p_width, current_gap_size) {
        if (b_x + b_radius > p_x && b_x - b_radius < p_x + p_width) {
            if (b_y - b_radius < p_gap_start_y || b_y + b_radius > p_gap_start_y + current_gap_size) {
                return true;
            }
        }
        if (b_y + b_radius > base_y) return true;
        if (b_y - b_radius < 0) return true; // Hit the top
        return false;
    }

    function resetGame() {
        bird_y = SCREEN_HEIGHT / 2;
        bird_y_change = 0;
        pipe_x = SCREEN_WIDTH;
        pipe_gap = BASE_PIPE_GAP; // Reset pipe_gap to base on new game

        const playable_area_height = SCREEN_HEIGHT - BASE_HEIGHT;
        const min_pipe_segment_height = bird_radius * 1;

        let y_range_start_min = min_pipe_segment_height;
        let y_range_start_max = playable_area_height - BASE_PIPE_GAP - min_pipe_segment_height;

        if (y_range_start_min >= y_range_start_max) {
            y_range_start_min = bird_radius * 0.5;
            y_range_start_max = Math.max(y_range_start_min + bird_radius, playable_area_height - BASE_PIPE_GAP - (bird_radius * 0.5));
             if (y_range_start_min >= y_range_start_max) {
                y_range_start_max = y_range_start_min + BASE_PIPE_GAP * 0.1;
             }
        }
        
        const y_gap_start_total_range = Math.max(0, y_range_start_max - y_range_start_min);

        pipe_position_cycle[0] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.25);
        pipe_position_cycle[1] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.75);
        pipe_position_cycle[2] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.50);
        
        for(let i=0; i < pipe_position_cycle.length; i++) {
            pipe_position_cycle[i] = Math.max(min_pipe_segment_height, pipe_position_cycle[i]);
            pipe_position_cycle[i] = Math.min(pipe_position_cycle[i], playable_area_height - BASE_PIPE_GAP - min_pipe_segment_height);
        }

        pipe_position_index = Math.floor(Math.random() * pipe_position_cycle.length);
        current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];

        score = 0;
        gameOver = false;
        paused = false; // Ensure paused is reset
        gameRunning = true;

        startMessage.style.display = 'none';
        pausedMessage.style.display = 'none';
        gameOverMessage.style.display = 'none';
        instructionsDiv.style.display = 'block';
        if (pauseButton) pauseButton.textContent = 'Pause (P)'; // Reset button text
        updateDifficultyDisplay();
        updatePipeGapDisplay();
    }

    function gameLoop() {
        if (!gameRunning && !gameOver) { // Start screen
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawBackground();
            drawBase();
            drawBird(bird_x, bird_y); // Draw bird in initial position
            updateAndDrawScore(score); // Show score 0

            startMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)';
            updateDifficultyDisplay();
            updatePipeGapDisplay();
            requestAnimationFrame(gameLoop);
            return;
        }

        if (paused) {
            pausedMessage.style.display = 'block';
            instructionsDiv.style.display = 'block'; // Keep instructions visible
            // updatePipeGapDisplay(); // Already updated per frame or on change
            requestAnimationFrame(gameLoop); // Keep calling to check for resume
            return;
        } else {
            pausedMessage.style.display = 'none';
        }

        if (gameOver) {
            finalScoreSpan.textContent = score;
            gameOverMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)';
            updateDifficultyDisplay();
            // updatePipeGapDisplay(); // Show final gap size
            requestAnimationFrame(gameLoop); // Keep calling to check for restart
            return;
        }

        // Game logic
        bird_y_change += gravity;
        bird_y += bird_y_change;

        pipe_x -= scroll_speed;
        if (pipe_x < -PIPE_WIDTH) {
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
            // No reduction for NORMAL difficulty, pipe_gap remains BASE_PIPE_GAP unless changed by difficulty switch
        }

        if (checkCollision(bird_x, bird_y, bird_radius, pipe_x, current_pipe_gap_start_y, PIPE_WIDTH, pipe_gap)) {
            gameOver = true;
            gameRunning = false;
        }

        // Drawing
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        drawBackground();
        drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
        drawBase();
        drawBird(bird_x, bird_y);
        updateAndDrawScore(score);
        updatePipeGapDisplay(); // Update pipe gap display every frame during gameplay

        requestAnimationFrame(gameLoop);
    }

    function performFlapAction() {
        if (!gameRunning && !gameOver) { // On start screen
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameOver) { // On game over screen
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameRunning && !paused) { // During active gameplay
            bird_y_change = flap_strength;
        }
    }

    // Keyboard Event Listeners
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === ' ') {
            event.preventDefault(); // Prevent page scroll
            performFlapAction();
        } else if ((event.key === 'p' || event.key === 'P') && gameRunning && !gameOver) {
            paused = !paused;
            if (paused) {
                pausedMessage.style.display = 'block';
                if (pauseButton) pauseButton.textContent = 'Resume (P)';
            } else {
                pausedMessage.style.display = 'none';
                if (pauseButton) pauseButton.textContent = 'Pause (P)';
                gameLoop(); // Resume game loop
            }
        } else if (event.key === 'n' || event.key === 'N') {
            const oldDifficulty = currentDifficulty;
            currentDifficultyIndex = (currentDifficultyIndex + 1) % DIFFICULTY_CYCLE_VALUES.length;
            currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];
            updateDifficultyDisplay();

            if (!gameRunning) { // Game not started or game over
                pipe_gap = BASE_PIPE_GAP;
            } else { // Game is currently running
                if (currentDifficulty === DIFFICULTIES.NORMAL && (oldDifficulty === DIFFICULTIES.HARD || oldDifficulty === DIFFICULTIES.EXTRA_HARD)) {
                    pipe_gap = BASE_PIPE_GAP; // Reset to base if switching to Normal
                }
                // If switching to Hard/ExtraHard from Normal, pipe_gap might already be BASE_PIPE_GAP.
                // Reduction will start on next pipe.
            }
            updatePipeGapDisplay();
        }
    });

    // Touch/Mouse Listeners for Flap
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Important for mobile to prevent zoom/scroll
        performFlapAction();
    });
    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault(); // Prevent text selection or other default actions
        performFlapAction();
    });

    // Onscreen Button Event Listeners
    if (flapButton) {
        flapButton.addEventListener('click', () => {
            performFlapAction();
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (gameRunning && !gameOver) { // Only allow pause if game is running and not over
                paused = !paused;
                if (paused) {
                    pausedMessage.style.display = 'block';
                    pauseButton.textContent = 'Resume (P)';
                    // gameLoop will stop its main logic due to 'paused' flag
                } else {
                    pausedMessage.style.display = 'none';
                    pauseButton.textContent = 'Pause (P)';
                    gameLoop(); // Resume game loop explicitly
                }
            }
        });
    }

    if (difficultyButton) {
        difficultyButton.addEventListener('click', () => {
            const oldDifficulty = currentDifficulty;
            currentDifficultyIndex = (currentDifficultyIndex + 1) % DIFFICULTY_CYCLE_VALUES.length;
            currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];
            updateDifficultyDisplay();

            if (!gameRunning) { // Game not started or game over
                pipe_gap = BASE_PIPE_GAP;
            } else { // Game is currently running
                if (currentDifficulty === DIFFICULTIES.NORMAL && (oldDifficulty === DIFFICULTIES.HARD || oldDifficulty === DIFFICULTIES.EXTRA_HARD)) {
                    pipe_gap = BASE_PIPE_GAP; // Reset to base if switching to Normal
                }
            }
            updatePipeGapDisplay();
        });
    }

    // Initial Setup
    updateDifficultyDisplay();
    updatePipeGapDisplay(); // Initial call
    startMessage.style.display = 'block';
    instructionsDiv.style.display = 'block';
    if (pauseButton) pauseButton.textContent = 'Pause (P)';

    gameLoop(); // Start the game loop
});
