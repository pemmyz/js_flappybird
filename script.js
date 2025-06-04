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

    // Autobot State
    let autobotActive = false;
    let autobotRestartScheduled = false;

    // Autobot Demo Mode State
    let autobotDemoCountdownValue = 5;
    let autobotDemoTimerId = null;
    let autobotDemoSuccessfullyLaunched = false;

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
    const autobotDemoStatusDisplayElement = document.getElementById('autobotDemoStatusDisplay');

    const flapButton = document.getElementById('flapBtn');
    const pauseButton = document.getElementById('pauseBtn');
    const difficultyButton = document.getElementById('difficultyBtn');


    function startAutobotDemoCountdown() {
        // Only start countdown if game isn't running, demo hasn't successfully launched, and no timer is already active.
        if (gameRunning || gameOver || autobotDemoSuccessfullyLaunched || autobotDemoTimerId) {
            if (autobotDemoStatusDisplayElement && autobotDemoSuccessfullyLaunched && autobotActive) {
                autobotDemoStatusDisplayElement.textContent = 'Autobot Demo Active';
                autobotDemoStatusDisplayElement.style.display = 'block';
            }
            return;
        }

        autobotDemoCountdownValue = 5;
        if (autobotDemoStatusDisplayElement) {
            autobotDemoStatusDisplayElement.textContent = `Autobot demo starting in ${autobotDemoCountdownValue}...`;
            autobotDemoStatusDisplayElement.style.display = 'block';
        }

        autobotDemoTimerId = setInterval(() => {
            autobotDemoCountdownValue--;
            if (autobotDemoStatusDisplayElement) {
                autobotDemoStatusDisplayElement.textContent = `Autobot demo starting in ${autobotDemoCountdownValue}...`;
            }

            if (autobotDemoCountdownValue <= 0) {
                clearInterval(autobotDemoTimerId);
                autobotDemoTimerId = null;
                // Ensure game hasn't been started by player and autobot isn't manually on
                if (!gameRunning && !gameOver && !autobotActive) {
                    autobotActive = true;
                    autobotDemoSuccessfullyLaunched = true;
                    updateAutobotStatusDisplay();
                    if (autobotDemoStatusDisplayElement) {
                        autobotDemoStatusDisplayElement.textContent = 'Autobot Demo Active';
                        // No need to set display:block here, it's already block or will be by game state
                    }
                    performFlapAction(); // Start the game with autobot
                } else {
                    // Game was started by player or autobot manually toggled during countdown
                    clearAndHideAutobotDemoStatus(false); // Don't turn off autobot if player manually turned it on
                }
            }
        }, 1000);
    }

    function clearAndHideAutobotDemoStatus(turnOffAutobotIfDemoLaunched = true) {
        if (autobotDemoTimerId) {
            clearInterval(autobotDemoTimerId);
            autobotDemoTimerId = null;
        }
        if (autobotDemoStatusDisplayElement) {
            autobotDemoStatusDisplayElement.style.display = 'none';
            autobotDemoStatusDisplayElement.textContent = '';
        }
        // If the demo had launched the autobot, and now it's being cleared by player action,
        // turn off the autobot.
        if (turnOffAutobotIfDemoLaunched && autobotDemoSuccessfullyLaunched && autobotActive) {
            autobotActive = false;
            updateAutobotStatusDisplay();
        }
        autobotDemoSuccessfullyLaunched = false; // Reset this flag
    }


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
        scoreDisplayElement.textContent = `Score: ${currentScore}`; // Update HTML score
        // Draw score on canvas
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        const scoreText = String(currentScore);
        const textWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, (SCREEN_WIDTH / 2) - (textWidth / 2), 70);
    }

    function checkCollision(b_x, b_y, b_radius, p_x, p_gap_start_y, p_width, current_gap_size) {
        // Defensive check for pipe parameters
        if (p_x === undefined || p_gap_start_y === undefined || current_gap_size === undefined) {
             return false; 
        }
        // Collision with pipes
        if (b_x + b_radius > p_x && b_x - b_radius < p_x + p_width) { // Horizontal alignment
            if (b_y - b_radius < p_gap_start_y || b_y + b_radius > p_gap_start_y + current_gap_size) { // Vertical collision
                return true;
            }
        }
        // Collision with base
        if (b_y + b_radius > base_y) return true;
        // Collision with top of screen
        if (b_y - b_radius < 0) return true;
        return false;
    }
    
    function resetGame() {
        bird_y = SCREEN_HEIGHT / 2;
        bird_y_change = 0;
        pipe_x = SCREEN_WIDTH;
        
        // Reset pipe_gap based on current difficulty
        if (currentDifficulty === DIFFICULTIES.NORMAL) {
            pipe_gap = BASE_PIPE_GAP;
        } else { // Hard or Extra Hard - start with base gap, will shrink in gameplay
            pipe_gap = BASE_PIPE_GAP;
        }
        pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap); // Ensure it's not below min

        const playable_area_height = SCREEN_HEIGHT - BASE_HEIGHT;
        const min_pipe_segment_height = bird_radius * 0.5; // Minimum height for top/bottom pipe segments

        let y_range_start_min = min_pipe_segment_height;
        let y_range_start_max = playable_area_height - pipe_gap - min_pipe_segment_height;

        // Ensure y_range_start_max is always greater than y_range_start_min
        if (y_range_start_min >= y_range_start_max) {
            y_range_start_min = bird_radius * 0.25; 
            y_range_start_max = playable_area_height - pipe_gap - (bird_radius * 0.25);
            if (y_range_start_min >= y_range_start_max) { 
                y_range_start_max = y_range_start_min + Math.max(10, pipe_gap * 0.1); // Force a small valid range
            }
        }
        
        const y_gap_start_total_range = Math.max(1, y_range_start_max - y_range_start_min); // Ensure range is at least 1

        pipe_position_cycle[0] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.25);
        pipe_position_cycle[1] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.75);
        pipe_position_cycle[2] = Math.floor(y_range_start_min + y_gap_start_total_range * 0.50);
        
        for(let i=0; i < pipe_position_cycle.length; i++) {
            pipe_position_cycle[i] = Math.max(min_pipe_segment_height, pipe_position_cycle[i]);
            pipe_position_cycle[i] = Math.min(pipe_position_cycle[i], playable_area_height - pipe_gap - min_pipe_segment_height);
        }

        pipe_position_index = Math.floor(Math.random() * pipe_position_cycle.length);
        current_pipe_gap_start_y = pipe_position_cycle[pipe_position_index];
        
        // Fallback if calculation is problematic (should be rare with improved logic)
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
        updatePipeGapDisplay(); // Reflects potentially reset pipe_gap

        // If autobot demo had launched and is still meant to be active, keep its status message
        if (autobotDemoSuccessfullyLaunched && autobotActive && autobotDemoStatusDisplayElement) {
             autobotDemoStatusDisplayElement.textContent = 'Autobot Demo Active';
             autobotDemoStatusDisplayElement.style.display = 'block';
        } else if (!autobotActive && autobotDemoSuccessfullyLaunched) { // If demo was active but autobot got turned off (e.g. player restart)
             clearAndHideAutobotDemoStatus(false); // Clear demo status without trying to turn off an already off autobot
        }
    }

    function performFlapAction() {
        if (!gameRunning && !gameOver) { // Start game
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameOver) { // Restart game
            resetGame();
            bird_y_change = flap_strength;
        } else if (gameRunning && !paused) { // Flap during active game
            bird_y_change = flap_strength;
        }
    }

    function handlePlayerFlapIntent() {
        clearAndHideAutobotDemoStatus(); // Player action interrupts demo
        // Player can always start/restart the game with a flap
        if (!gameRunning || gameOver) {
            performFlapAction();
        } 
        // Player can only flap mid-game if autobot is OFF
        else if (gameRunning && !paused && !autobotActive) {
            performFlapAction();
        }
    }

    function gameLoop() {
        // --- Start Screen ---
        if (!gameRunning && !gameOver) {
            // Attempt to start/restart demo countdown if appropriate
            // Only if no timer, demo hasn't launched, game isn't running/over
            if (!autobotDemoTimerId && !autobotDemoSuccessfullyLaunched) {
                 startAutobotDemoCountdown();
            }

            // Always draw the start screen elements
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawBackground();
            drawBase();
            drawBird(bird_x, bird_y); // Draw bird in its initial position
            updateAndDrawScore(score); // Draw score "0"

            startMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)'; // Ensure pause button text is correct
            
            // Update other UI elements
            updateDifficultyDisplay();
            updateAutobotStatusDisplay();
            updatePipeGapDisplay();
            
            requestAnimationFrame(gameLoop);
            return;
        }

        // --- Paused Screen ---
        if (paused) {
            // The pausedMessage overlay is handled by its event listener.
            // No game logic updates or re-drawing of game elements.
            requestAnimationFrame(gameLoop);
            return;
        }
        
        // --- Game Over Screen ---
        if (gameOver) {
            // Draw the final game state once on canvas
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawBackground();
             if (typeof current_pipe_gap_start_y !== 'undefined' && !isNaN(current_pipe_gap_start_y)) {
                drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap); // Draw final pipe positions
            }
            drawBase();
            drawBird(bird_x, bird_y); // Draw bird in its final position
            updateAndDrawScore(score); // Draw final score on canvas and update HTML

            // Manage HTML overlays and UI text
            finalScoreSpan.textContent = score;
            gameOverMessage.style.display = 'block';
            instructionsDiv.style.display = 'block';
            if (pauseButton) pauseButton.textContent = 'Pause (P)'; // Reset pause button text
            updateDifficultyDisplay();
            updateAutobotStatusDisplay();

            // Persist "Autobot Demo Active" message if it was the demo that was running
            if (autobotDemoSuccessfullyLaunched && autobotActive && autobotDemoStatusDisplayElement) {
                 autobotDemoStatusDisplayElement.textContent = 'Autobot Demo Active';
                 autobotDemoStatusDisplayElement.style.display = 'block';
            } else if (!autobotActive && autobotDemoSuccessfullyLaunched) { 
                // If demo was active but got turned off somehow (e.g. player manually on game over screen)
                 clearAndHideAutobotDemoStatus(false);
            }


            // Autobot auto-restart logic
            if (autobotActive && !autobotRestartScheduled) {
                autobotRestartScheduled = true;
                setTimeout(() => {
                    if (autobotActive && gameOver && !gameRunning) { // Check conditions again before restarting
                        performFlapAction(); 
                    }
                    if(autobotRestartScheduled) autobotRestartScheduled = false; 
                }, 1500); 
            }
            requestAnimationFrame(gameLoop);
            return;
        }

        // --- Active Gameplay Logic (gameRunning is true, not paused, not game over) ---
        bird_y_change += gravity;
        bird_y += bird_y_change;

        // AUTOBOT LOGIC
        if (autobotActive && gameRunning && !paused && !gameOver) {
            // Ensure current_pipe_gap_start_y and pipe_gap are valid for targeting
            if (typeof current_pipe_gap_start_y !== 'undefined' && !isNaN(current_pipe_gap_start_y) &&
                typeof pipe_gap !== 'undefined' && !isNaN(pipe_gap)) {
                
                const top_of_bottom_pipe = current_pipe_gap_start_y + pipe_gap;
                
                // Safety offset: bird's bottom should be (bird_radius / 2 + 3) pixels ABOVE the top_of_bottom_pipe
                const safety_offset = (bird_radius / 2) + 3; 

                // This is the Y-coordinate line that the bird's bottom edge should not go below.
                const flap_decision_line_for_bird_bottom = top_of_bottom_pipe - safety_offset;
                
                const bird_current_bottom_y = bird_y + bird_radius;

                if (bird_y_change >= 0 && // Bird is falling or at its peak (velocity is non-negative)
                    bird_current_bottom_y >= flap_decision_line_for_bird_bottom) { 
                    performFlapAction();
                }
            } else {
                // Fallback: If pipe data isn't ready
                if (bird_y_change > 0.2 && bird_y + bird_radius > SCREEN_HEIGHT * 0.70) { 
                    performFlapAction();
                }
            }
        }

        // PIPE MOVEMENT AND SCORING
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

            // Adjust difficulty
            if (currentDifficulty === DIFFICULTIES.HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 2);
            } else if (currentDifficulty === DIFFICULTIES.EXTRA_HARD) {
                pipe_gap = Math.max(MIN_PIPE_GAP, pipe_gap - 5);
            }
            updatePipeGapDisplay(); // Update HTML display for pipe gap
        }

        // COLLISION CHECK
        if (checkCollision(bird_x, bird_y, bird_radius, pipe_x, current_pipe_gap_start_y, PIPE_WIDTH, pipe_gap)) {
            gameOver = true;
            gameRunning = false; // Stop game running on collision
        }

        // --- Drawing Active Game ---
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        drawBackground();
        if (typeof current_pipe_gap_start_y !== 'undefined' && !isNaN(current_pipe_gap_start_y)) {
             drawPipe(pipe_x, current_pipe_gap_start_y, pipe_gap);
        }
        drawBase();
        drawBird(bird_x, bird_y);
        updateAndDrawScore(score); // This draws the score on canvas AND updates HTML

        requestAnimationFrame(gameLoop);
    }

    // Keyboard Event Listeners
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === ' ') {
            event.preventDefault();
            handlePlayerFlapIntent();
        } else if ((event.key === 'p' || event.key === 'P') && !gameOver) { // Allow pause if not game over
            // Check if game is in a pausable state (running OR demo was launched and hasn't been fully superseded by player)
            if (gameRunning || (autobotDemoSuccessfullyLaunched && autobotActive) ) {
                clearAndHideAutobotDemoStatus(); // Any pause action clears the demo
                paused = !paused;
                if (paused) {
                    pausedMessage.style.display = 'block';
                    if (pauseButton) pauseButton.textContent = 'Resume (P)';
                } else {
                    pausedMessage.style.display = 'none';
                    if (pauseButton) pauseButton.textContent = 'Pause (P)';
                }
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
            clearAndHideAutobotDemoStatus(false); // Clear demo status, but don't turn off autobot if player just turned it ON

            if (autobotActive && (!gameRunning || gameOver) && !autobotRestartScheduled) {
                autobotRestartScheduled = true;
                setTimeout(() => { 
                    if (autobotActive && (!gameRunning || gameOver) ) { 
                        performFlapAction(); 
                    }
                    if(autobotRestartScheduled) autobotRestartScheduled = false;
                }, gameRunning ? 10 : 250); 
            }
        }
    });

    // Touch and Mouse Event Listeners
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        handlePlayerFlapIntent();
    }, { passive: false });

    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        handlePlayerFlapIntent();
    });

    // Onscreen Button Event Listeners
    if (flapButton) {
        flapButton.addEventListener('click', handlePlayerFlapIntent);
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
             // Allow pause if not game over and game is in a pausable state
            if (!gameOver && (gameRunning || (autobotDemoSuccessfullyLaunched && autobotActive))) {
                clearAndHideAutobotDemoStatus();
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
    if (currentDifficulty === DIFFICULTIES.NORMAL) { // Set initial pipe_gap
        pipe_gap = BASE_PIPE_GAP;
    } else {
        pipe_gap = BASE_PIPE_GAP; 
    }
    // `current_pipe_gap_start_y` will be properly initialized by the first call to `resetGame()`
    // when the game starts (via `performFlapAction`).
    
    updateDifficultyDisplay();
    updateAutobotStatusDisplay();
    updatePipeGapDisplay();
    startMessage.style.display = 'block'; // Ensure this is visible initially
    instructionsDiv.style.display = 'block';
    if (autobotDemoStatusDisplayElement) autobotDemoStatusDisplayElement.style.display = 'none'; // Initially hide demo status

    // Start the autobot demo countdown on page load
    startAutobotDemoCountdown();

    gameLoop();
});
