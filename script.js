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
    const GREEN = "#00FF00"; // Pipe color
    const RED = "#FF0000";   // Bird color
    const BIRD_COLOR = RED;
    const PIPE_COLOR = GREEN;
    const BASE_COLOR = BLACK; // Color for the base/ground

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
    let current_pipe_gap_start_y; // Y-coordinate where the current pipe gap begins

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

    // Autobot State
    let autobotActive = false;
    let autobotRestartScheduled = false;

    // DOM Elements
    const scoreDisplayElement = document.getElementById('scoreDisplay');
    const pipeGapDisplayElement = document.getElementById('pipeGapDisplay');
    const startMessage = document.getElementById('startMessage');
    const pausedMessage = document.getElementById('pausedMessage');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreSpan = document.getElementById('finalScore');
    const instructionsDiv = document.getElementById('instructions');
    const difficultyDisplayElement = document.getElementById('difficultyDisplayElement');
    const autobotStatusDisplayElement = document.getElementById('autobotStatusDisplay');

    const flapButton = document.getElementById('flapBtn');
    const pauseButton = document.getElementById('pauseBtn');
    const difficultyButton = document.getElementById('difficultyBtn');

    function updateDifficultyDisplay() {
        if (difficultyDisplayElement) {
            difficultyDisplayElement.textContent = `Difficulty: ${currentDifficulty} (Press N to change)`;
        }
    }

    function updateAutobotStatusDisplay() {
        if (autobotStatusDisplayElement) {
            autobotStatusDisplayElement.textContent = `Autobot: ${autobotActive ? 'ON' : 'OFF'} (Press B to toggle)`;
        }
    }

    function updatePipeGapDisplay() {
        if (pipeGapDisplayElement) {
            pipeGapDisplayElement.textContent = `Gate Size: ${Math.round(pipe_gap)}`;
        }
    }

    function drawBackground() {
        // Background is set by CSS on #gameCanvas
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
        if (p_x === undefined || p_gap_start_y === undefined || current_gap_size === undefined) {
             return false; 
        }
        if (b_x + b_radius > p_x && b_x - b_radius < p_x + p_width) {
            if (b_y - b_radius < p_gap_start_y || b_y + b_radius > p_gap_start_y + current_gap_size) {
                return true;
            }
        }
        if (b_y + b_radius > base_y) return true;
        if (b_y - b_radius < 0) return true;
        return false;
    }

    function resetGame() {
        bird_y = SCREEN_HEIGHT / 2;
        bird_y_change = 0;
        pipe_x = SCREEN_WIDTH;
        
        if (currentDifficulty === DIFFICULTIES.NORMAL) {
            pipe_gap = BASE_PIPE_GAP;
        } else { 
            pipe_gap = BASE_PIPE_GAP;
        }
        pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap);

        const playable_area_height = SCREEN_HEIGHT - BASE_HEIGHT;
        const min_pipe_segment_height = bird_radius * 0.5;

        let y_range_start_min = min_pipe_segment_height;
        let y_range_start_max = playable_area_height - pipe_gap - min_pipe_segment_height;

        if (y_range_start_min >= y_range_start_max) {
            y_range_start_min = bird_radius * 0.25; 
            y_range_start_max = playable_area_height - pipe_gap - (bird_radius * 0.25);
            if (y_range_start_min >= y_range_start_max) { 
                y_range_start_max = y_range_start_min + Math.max(10, pipe_gap * 0.1);
            }
        }
        
        const y_gap_start_total_range = Math.max(1, y_range_start_max - y_range_start_min);

        pipe_position_cycle[0] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.25);
        pipe_position_cycle[1] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.75);
        pipe_position_cycle[2] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.50);
        
        for(let i=0; i < pipe_position_cycle.length; i++) {
            pipe_position_cycle[i] = Math.max(min_pipe_segment_height, pipe_position_cycle[i]);
            pipe_position_cycle[i] = Math.min(pipe_position_cycle[i], playable_area_height - pipe_gap - min_pipe_segment_height);
        }

        pipe_position_index = Math.floor(Math.random() * pipe_position_cycle.length);
        current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
        
        if (typeof current_pipe_gap_start_y === 'undefined' || isNaN(current_pipe_gap_start_y) || 
            current_pipe_gap_start_y < 0 || current_pipe_gap_start_y + pipe_gap > playable_area_height) {
            current_pipe_gap_start_y = Math.max(min_pipe_segment_height, (playable_area_height - pipe_gap) / 3);
        }

        score = 0;
        gameOver = false;
        paused = false;
        gameRunning = true;
        autobotRestartScheduled = false;

        startMessage.style.display = 'none';
        pausedMessage.style.display = 'none';
        gameOverMessage.style.display = 'none';
        instructionsDiv.style.display = 'block';
        if (pauseButton) pauseButton.textContent = 'Pause (P)';

        updateDifficultyDisplay();
        updateAutobotStatusDisplay();
        updatePipeGapDisplay();
    }

    function performFlapAction() {
        if (!gameRunning && !gameOver) { 
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameOver) { 
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameRunning && !paused) { 
            bird_y_change = flap_strength;
        }
    }

    function handlePlayerFlapIntent() {
        if (!gameRunning || gameOver) {
            performFlapAction();
        } 
        else if (gameRunning && !paused && !autobotActive) {
            performFlapAction();
        }
    }

    function gameLoop() {
        if (!gameRunning && !gameOver) { 
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawBackground();
            drawBase();
            drawBird(bird_x, bird_y);
            updateAndDrawScore(score);

            startMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)';
            updateDifficultyDisplay();
            updateAutobotStatusDisplay();
            updatePipeGapDisplay();
            requestAnimationFrame(gameLoop);
            return;
        }

        if (paused) {
            requestAnimationFrame(gameLoop);
            return;
        }
        
        if (gameOver) {
            finalScoreSpan.textContent = score;
            gameOverMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)';
            updateDifficultyDisplay();
            updateAutobotStatusDisplay();

            if (autobotActive && !autobotRestartScheduled) {
                autobotRestartScheduled = true;
                setTimeout(() => {
                    if (autobotActive && gameOver && !gameRunning) {
                        performFlapAction(); 
                    }
                    if(autobotRestartScheduled) autobotRestartScheduled = false; 
                }, 1500); 
            }
            requestAnimationFrame(gameLoop);
            return;
        }

        // --- Active Gameplay Logic ---
        bird_y_change += gravity;
        bird_y += bird_y_change;

        // --- AUTOBOT LOGIC ---
        if (autobotActive && gameRunning && !paused && !gameOver) {
            // Ensure current_pipe_gap_start_y is valid for targeting
            if (typeof current_pipe_gap_start_y !== 'undefined' && !isNaN(current_pipe_gap_start_y) &&
                typeof pipe_gap !== 'undefined' && !isNaN(pipe_gap)) {
                
                // Target Y for the bird's BOTTOM edge: top of the lower pipe.
                const targetBirdBottomY = current_pipe_gap_start_y + pipe_gap;
                
                // Current bottom Y of the bird
                const birdCurrentBottomY = bird_y + bird_radius;

                // Flap if the bird is falling and its bottom is at or has just passed the target level.
                // The bird should flap to prevent its bottom from going *below* targetBirdBottomY.
                const flapDecisionThreshold = targetBirdBottomY; 
                // A small positive offset can be added to targetBirdBottomY if it tends to hit:
                // const flapDecisionThreshold = targetBirdBottomY + 2; // flaps if birdBottom >= target + 2 (i.e. slightly lower)

                // Uncomment for debugging:
                // console.log(`Autobot: bird_y: ${bird_y.toFixed(1)}, birdBottom: ${birdCurrentBottomY.toFixed(1)}, targetBottomY: ${targetBirdBottomY.toFixed(1)}, v_y: ${bird_y_change.toFixed(1)}, pipe_y_start: ${current_pipe_gap_start_y}`);

                if (bird_y_change >= 0 && // Bird is falling or at peak (velocity is non-negative)
                    birdCurrentBottomY >= flapDecisionThreshold) { // Bird's bottom is at or below the target flap point
                    // console.log("Autobot: Flap condition met. Flapping!");
                    performFlapAction();
                }
            } else {
                // Fallback: If pipe data isn't ready (e.g., very start before first reset, or an error),
                // maintain a generic altitude to prevent immediate ground hit.
                // Flap if falling and below, say, 60% of screen height.
                // This fallback should ideally not be needed if resetGame initializes correctly.
                if (bird_y_change > 0.2 && bird_y + bird_radius > SCREEN_HEIGHT * 0.65) { // Check if significantly falling & low
                    // console.log("Autobot: Fallback flap due to undefined pipe data or being too low without pipe data.");
                    performFlapAction();
                }
            }
        }
        // --- END AUTOBOT LOGIC ---

        pipe_x -= scroll_speed;
        if (pipe_x < -PIPE_WIDTH) {
            pipe_x = SCREEN_WIDTH;
            pipe_position_index = (pipe_position_index + 1) % pipe_position_cycle.length;
            current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
            
            if (typeof current_pipe_gap_start_y === 'undefined' || isNaN(current_pipe_gap_start_y)) {
                 const playable_area_height = SCREEN_HEIGHT - BASE_HEIGHT;
                 const min_pipe_segment_height = bird_radius * 0.5;
                 current_pipe_gap_start_y = Math.max(min_pipe_segment_height, (playable_area_height - pipe_gap) / 3);
            }
            score += 1;

            if (currentDifficulty === DIFFICULTIES.HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 2);
            } else if (currentDifficulty === DIFFICULTIES.EXTRA_HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 5);
            }
            updatePipeGapDisplay();
        }

        if (checkCollision(bird_x, bird_y, bird_radius, pipe_x, current_pipe_gap_start_y, PIPE_WIDTH, pipe_gap)) {
            gameOver = true;
            gameRunning = false;
        }

        // --- Drawing ---
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        drawBackground();
        if (typeof current_pipe_gap_start_y !== 'undefined' && !isNaN(current_pipe_gap_start_y)) {
             drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
        }
        drawBase();
        drawBird(bird_x, bird_y);
        updateAndDrawScore(score);

        requestAnimationFrame(gameLoop);
    }

    // Keyboard Event Listeners
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === ' ') {
            event.preventDefault();
            handlePlayerFlapIntent();
        } else if ((event.key === 'p' || event.key === 'P') && gameRunning && !gameOver) {
            paused = !paused;
            if (paused) {
                pausedMessage.style.display = 'block';
                if (pauseButton) pauseButton.textContent = 'Resume (P)';
            } else {
                pausedMessage.style.display = 'none';
                if (pauseButton) pauseButton.textContent = 'Pause (P)';
            }
        } else if (event.key === 'n' || event.key === 'N') {
            const oldDifficulty = currentDifficulty;
            currentDifficultyIndex = (currentDifficultyIndex + 1) % DIFFICULTY_CYCLE_VALUES.length;
            currentDifficulty = DIFFICULTY_CYCLE_VALUES[currentDifficultyIndex];
            updateDifficultyDisplay();

            if (currentDifficulty === DIFFICULTIES.NORMAL) {
                 pipe_gap = BASE_PIPE_GAP;
            } else { 
                if (!gameRunning || gameOver || oldDifficulty === DIFFICULTIES.NORMAL) {
                    pipe_gap = BASE_PIPE_GAP;
                }
            }
            pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap);
            updatePipeGapDisplay();
        } else if (event.key === 'b' || event.key === 'B') {
            autobotActive = !autobotActive;
            updateAutobotStatusDisplay();
            if (autobotActive && (!gameRunning || gameOver) && !autobotRestartScheduled) { // If autobot turned on at start/gameover
                autobotRestartScheduled = true;
                setTimeout(() => { // Use a short delay to allow game state to settle if it was game over
                    if (autobotActive && (!gameRunning || gameOver) ) { 
                        performFlapAction(); // This will call resetGame
                    }
                    if(autobotRestartScheduled) autobotRestartScheduled = false;
                }, gameRunning ? 10 : 250); // No delay if already running, small if not
            }
        }
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        handlePlayerFlapIntent();
    }, { passive: false });

    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        handlePlayerFlapIntent();
    });

    if (flapButton) {
        flapButton.addEventListener('click', handlePlayerFlapIntent);
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (gameRunning && !gameOver) {
                paused = !paused;
                if (paused) {
                    pausedMessage.style.display = 'block';
                    pauseButton.textContent = 'Resume (P)';
                } else {
                    pausedMessage.style.display = 'none';
                    pauseButton.textContent = 'Pause (P)';
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
            
            if (currentDifficulty === DIFFICULTIES.NORMAL) {
                 pipe_gap = BASE_PIPE_GAP;
            } else {
                 if (!gameRunning || gameOver || oldDifficulty === DIFFICULTIES.NORMAL) {
                    pipe_gap = BASE_PIPE_GAP;
                }
            }
            pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap);
            updatePipeGapDisplay();
        });
    }

    // Initial Game Setup
    bird_y = SCREEN_HEIGHT / 2;
    bird_y_change = 0;
    score = 0;
    pipe_x = SCREEN_WIDTH; 
    if (currentDifficulty === DIFFICULTIES.NORMAL) {
        pipe_gap = BASE_PIPE_GAP;
    } else {
        pipe_gap = BASE_PIPE_GAP; 
    }
    // `current_pipe_gap_start_y` will be properly initialized by the first call to `resetGame()`
    // when the game starts (via `performFlapAction`).
    
    updateDifficultyDisplay();
    updateAutobotStatusDisplay();
    updatePipeGapDisplay();
    startMessage.style.display = 'block';
    instructionsDiv.style.display = 'block';
    if (pauseButton) pauseButton.textContent = 'Pause (P)';

    gameLoop();
});
