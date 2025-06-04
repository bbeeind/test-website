document.addEventListener('DOMContentLoaded', () => {
    const availableItems = [
        { id: 'item1', src: 'image1.jpg' },
        { id: 'item2', src: 'image2.webp' },
        { id: 'item3', src: 'image3.webp' },
        { id: 'item4', src: 'image4.webp' },
        { id: 'item5', src: 'image5.webp' },
        { id: 'item6', src: 'image6.webp' },
        { id: 'item7', src: 'image7.webp' },
        { id: 'item8', src: 'image8.webp' },
        // Add more items if desired
    ];

    const MAX_SELECTIONS = 6;
    const BOARD_SIZE = 16; // 4x4 grid

    let selectedItems = []; // Stores the 'id' of selected items
    let boardSquares = [];  // Stores references to the 16 board square DOM elements
    let itemElements = [];  // Stores references to the <img> elements of the chosen items

    let currentItemPositions = []; // Stores the indices (0-15) where the 6 items are currently located on the board
    let currentLightedSquareIndex = -1; // Index of the currently lit square

    let lightIntervalId;
    let itemMoveIntervalId;

    // DOM Elements
    const messageArea = document.getElementById('message-area');
    const itemSelectionGrid = document.querySelector('.items-grid');
    const gameBoardElement = document.getElementById('game-board');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetSelectionBtn = document.getElementById('reset-selection-btn');

    // Audio Elements
    // Create an Audio object for background music.
    // Ensure you have a file named 'background_music.mp3' in the same directory as this script.
    const backgroundMusic = new Audio('background_music.mp3');
    backgroundMusic.loop = true; // Set the background music to loop continuously

    // Create an Audio object for the "missed" sound.
    // Ensure you have a file named 'missed_music.mp3' in the same directory as this script.
    const missedMusic = new Audio('missed_music.mp3');

    // Create an Audio object for the "win" sound.
    // Ensure you have a file named 'win_music.mp3' in the same directory as this script.
    const winMusic = new Audio('win_music.mp3');

    // --- Helper Functions ---

    /**
     * Displays a message in the message area.
     * @param {string} msg - The message to display.
     * @param {string} type - The type of message (e.g., 'info', 'win', 'lose') for styling.
     */
    function displayMessage(msg, type = 'info') {
        messageArea.innerHTML = `<p class="${type}">${msg}</p>`;
        // Optional: add CSS classes for win/loss/info messages
        messageArea.className = `message ${type}`;
    }

    /**
     * Generates an array of unique random numbers.
     * @param {number} count - The number of unique random numbers to generate.
     * @param {number} max - The maximum value (exclusive) for the random numbers.
     * @returns {number[]} An array of unique random numbers.
     */
    function getRandomUniqueNumbers(count, max) {
        const numbers = new Set();
        while (numbers.size < count) {
            numbers.add(Math.floor(Math.random() * max));
        }
        return Array.from(numbers);
    }

    /**
     * Creates an item card element for selection.
     * @param {object} item - The item object containing id and src.
     * @returns {HTMLElement} The created item card div element.
     */
    function createItemCard(item) {
        const div = document.createElement('div');
        div.classList.add('item-card');
        div.dataset.itemId = item.id;
        div.innerHTML = `<img src="${item.src}" alt="${item.id}">`;
        div.addEventListener('click', () => selectItem(item.id, div));
        return div;
    }

    /**
     * Creates a board square element for the game board.
     * @param {number} index - The index of the square.
     * @returns {HTMLElement} The created board square div element.
     */
    function createBoardSquare(index) {
        const div = document.createElement('div');
        div.classList.add('board-square');
        div.dataset.squareIndex = index;
        return div;
    }

    /**
     * Disables all item selection cards.
     */
    function disableAllItemCards() {
        document.querySelectorAll('.item-card').forEach(card => card.classList.add('disabled'));
    }

    /**
     * Enables all item selection cards.
     */
    function enableAllItemCards() {
        document.querySelectorAll('.item-card').forEach(card => card.classList.remove('disabled'));
    }

    /**
     * Places the selected items onto random positions on the game board.
     * @param {number[]} positions - An array of indices where items should be placed.
     */
    function placeItemsOnBoard(positions) {
        // Clear existing items from the board
        boardSquares.forEach(square => {
            while (square.firstChild) {
                square.removeChild(square.firstChild);
            }
        });

        // Place new item elements
        itemElements.forEach((itemEl, index) => {
            if (positions[index] !== undefined && boardSquares[positions[index]]) {
                boardSquares[positions[index]].appendChild(itemEl);
            }
        });
        currentItemPositions = [...positions]; // Update current item positions
    }

    // --- Game Logic Functions ---

    /**
     * Initializes or resets the game state.
     */
    function initializeGame() {
        displayMessage('Pick 6 items to start!');
        selectedItems = [];
        itemElements = [];
        currentItemPositions = [];
        currentLightedSquareIndex = -1;

        // Clear item selection grid
        itemSelectionGrid.innerHTML = '';
        availableItems.forEach(item => {
            itemSelectionGrid.appendChild(createItemCard(item));
        });

        // Clear game board
        gameBoardElement.innerHTML = '';
        boardSquares = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            const square = createBoardSquare(i);
            gameBoardElement.appendChild(square);
            boardSquares.push(square);
        }

        // Reset button states
        startBtn.disabled = true;
        stopBtn.disabled = true;
        resetSelectionBtn.disabled = true;
        enableAllItemCards(); // Ensure item cards are selectable

        // Stop and reset background music if it's playing
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;

        // Stop and reset missed music
        missedMusic.pause();
        missedMusic.currentTime = 0;

        // Stop and reset win music
        winMusic.pause();
        winMusic.currentTime = 0;
    }

    /**
     * Handles the selection of an item.
     * @param {string} itemId - The ID of the selected item.
     * @param {HTMLElement} cardElement - The DOM element of the item card.
     */
    function selectItem(itemId, cardElement) {
        if (selectedItems.length < MAX_SELECTIONS && !selectedItems.includes(itemId)) {
            selectedItems.push(itemId);
            cardElement.classList.add('selected');
            cardElement.classList.add('disabled'); // Disable selected item
            displayMessage(`Selected ${selectedItems.length}/${MAX_SELECTIONS} items.`);

            // Create the actual image element for the board
            const item = availableItems.find(i => i.id === itemId);
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.id;
            img.dataset.itemId = item.id; // Store item ID on the image element
            itemElements.push(img);

            if (selectedItems.length === MAX_SELECTIONS) {
                disableAllItemCards();
                startBtn.disabled = false;
                resetSelectionBtn.disabled = false;
                displayMessage('6 items selected! Click Start!');

                // Initial random placement of selected items
                const initialPositions = getRandomUniqueNumbers(MAX_SELECTIONS, BOARD_SIZE);
                placeItemsOnBoard(initialPositions);
            }
        }
    }

    /**
     * Resets the item selection and game state.
     */
    function resetSelection() {
        initializeGame(); // Re-initializes everything
        displayMessage('Selection reset. Pick 6 new items!');
    }

    /**
     * Starts the game, including board lighting and item movement.
     */
    function startGame() {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetSelectionBtn.disabled = true; // Disable reset during game play
        displayMessage('Game started! Click Stop to try your luck!');

        // Play background music when the game starts.
        // Use .catch() to handle potential errors if autoplay is blocked by the browser.
        backgroundMusic.play().catch(e => console.error("Error playing background music:", e));

        // Ensure missed music is stopped if it was somehow playing
        missedMusic.pause();
        missedMusic.currentTime = 0;

        // Ensure win music is stopped if it was somehow playing
        winMusic.pause();
        winMusic.currentTime = 0;

        // Start lighting up squares
        lightIntervalId = setInterval(() => {
            if (currentLightedSquareIndex >= 0) {
                boardSquares[currentLightedSquareIndex].classList.remove('lighted');
            }
            currentLightedSquareIndex = (currentLightedSquareIndex + 1) % BOARD_SIZE;
            boardSquares[currentLightedSquareIndex].classList.add('lighted');
        }, 120); // Speed of light movement

        // Start moving items randomly
        itemMoveIntervalId = setInterval(() => {
            const newPositions = getRandomUniqueNumbers(MAX_SELECTIONS, BOARD_SIZE);
            placeItemsOnBoard(newPositions);
        }, 400); // Speed of item movement (slower than light)
    }

    /**
     * Stops the game, halting board lighting and item movement.
     */
    function stopGame() {
        clearInterval(lightIntervalId);
        clearInterval(itemMoveIntervalId);
        stopBtn.disabled = true;
        resetSelectionBtn.disabled = false; // Enable reset after game ends

        // Stop background music and reset it to the beginning.
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;

        displayMessage('Stopping...', 'info');

        // Ensure one square remains lit and check for win
        setTimeout(() => {
            // The currentLightedSquareIndex already holds the last lit square
            // boardSquares[currentLightedSquareIndex].classList.add('lighted'); // Ensure it stays lit

            determineWinner();
        }, 500); // Small delay to let animations settle
    }

    /**
     * Determines if the player won based on the final lit square.
     */
    function determineWinner() {
        const finalLitSquare = boardSquares[currentLightedSquareIndex];
        let won = false;

        // Check if the final lit square contains one of the selected items
        // We can do this by checking if any of the itemElements are children of the finalLitSquare
        itemElements.forEach(itemEl => {
            if (finalLitSquare.contains(itemEl)) {
                won = true;
            }
        });

        if (won) {
            displayMessage('CONGRATULATIONS! YOU WON!', 'win');
            finalLitSquare.classList.add('winner-square'); // Optional: Add a special win styling
            // Play win music if the player won
            winMusic.play().catch(e => console.error("Error playing win sound:", e));
        } else {
            displayMessage('Better luck next time!', 'lose');
            // Play missed music if the player did not win
            missedMusic.play().catch(e => console.error("Error playing missed sound:", e));
        }
        startBtn.disabled = false; // Allow restarting the game
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', startGame);
    stopBtn.addEventListener('click', stopGame);
    resetSelectionBtn.addEventListener('click', resetSelection);

    // Initial setup when the page loads
    initializeGame();
});
