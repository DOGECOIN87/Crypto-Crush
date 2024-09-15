// Constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Adjust canvas size based on device
function adjustCanvasSize() {
    const container = document.getElementById('game-container');
    const canvasWidth = container.clientWidth * 0.7; // 70% of container for canvas
    canvas.width = canvasWidth;
    canvas.height = canvasWidth; // Maintain square aspect ratio
}

// Initial canvas size adjustment
adjustCanvasSize();

// Update TOKEN_SIZE whenever canvas size changes
let TOKEN_SIZE = canvas.width / GRID_SIZE;

// Update canvas size on window resize
window.addEventListener('resize', () => {
    adjustCanvasSize();
    TOKEN_SIZE = canvas.width / GRID_SIZE;
    render();
});

// Game Constants
const GRID_SIZE = 9;
const COLORS = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22']; // Different colors for tokens
const TOKEN_TYPES = ['Bitcoin', 'Ethereum', 'Solana', 'Dogecoin', 'Litecoin', 'Ripple'];

// Game Variables
let grid = [];
let selectedToken = null;
let score = 0;
let movesLeft = 30;
const objective = 1000;
let gameOver = false;

// In-Game Currency
let currency = 500; // Starting tokens

// Booster States
let cryptoSwapActive = false;
let cryptoHammerActive = false;
let swapSelection = [];

// Token Class
class Token {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // Cryptocurrency type
        this.color = COLORS[type];
        this.isSpecial = false;
        this.specialType = null; // 'CoinBomb', 'TokenMiner', 'CryptoExploder'
    }

    draw() {
        // Draw the token rectangle
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * TOKEN_SIZE, this.y * TOKEN_SIZE, TOKEN_SIZE, TOKEN_SIZE);

        // Draw the token label
        ctx.fillStyle = '#fff';
        ctx.font = `${TOKEN_SIZE / 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TOKEN_TYPES[this.type].substring(0, 3), this.x * TOKEN_SIZE + TOKEN_SIZE / 2, this.y * TOKEN_SIZE + TOKEN_SIZE / 2);

        // Draw special indicators if applicable
        if (this.isSpecial) {
            ctx.fillStyle = '#fff';
            ctx.font = `${TOKEN_SIZE / 4}px Arial`;
            let symbol = '';
            switch (this.specialType) {
                case 'CoinBomb':
                    symbol = 'B';
                    break;
                case 'TokenMiner':
                    symbol = 'M';
                    break;
                case 'CryptoExploder':
                    symbol = 'E';
                    break;
            }
            ctx.fillText(symbol, this.x * TOKEN_SIZE + TOKEN_SIZE - TOKEN_SIZE / 6, this.y * TOKEN_SIZE + TOKEN_SIZE - TOKEN_SIZE / 6);
        }

        // Draw token border
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(this.x * TOKEN_SIZE, this.y * TOKEN_SIZE, TOKEN_SIZE, TOKEN_SIZE);
    }
}

// Initialize Grid with random tokens
function initGrid() {
    grid = [];
    for (let x = 0; x < GRID_SIZE; x++) {
        grid[x] = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            let type;
            do {
                type = getRandomType();
                grid[x][y] = new Token(x, y, type);
            } while (hasImmediateMatch(x, y));
        }
    }
}

// Get Random Token Type
function getRandomType() {
    return Math.floor(Math.random() * TOKEN_TYPES.length);
}

// Check for immediate matches during initialization to avoid starting with matches
function hasImmediateMatch(x, y) {
    // Check horizontal
    if (x >= 2) {
        if (grid[x - 1][y].type === grid[x][y].type && grid[x - 2][y].type === grid[x][y].type) {
            return true;
        }
    }
    // Check vertical
    if (y >= 2) {
        if (grid[x][y - 1].type === grid[x][y].type && grid[x][y - 2].type === grid[x][y].type) {
            return true;
        }
    }
    return false;
}

// Render the entire grid
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            grid[x][y].draw();
        }
    }
}

// Handle Clicks on the Canvas
canvas.addEventListener('click', function(event) {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const x = Math.floor(clickX / TOKEN_SIZE);
    const y = Math.floor(clickY / TOKEN_SIZE);

    // Handle Boosters
    if (cryptoSwapActive) {
        handleCryptoSwap(x, y);
        return;
    }

    if (cryptoHammerActive) {
        handleCryptoHammer(x, y);
        return;
    }

    // Handle Token Selection and Swapping
    if (selectedToken) {
        if (isAdjacent(selectedToken, {x, y})) {
            swapTokens(selectedToken, {x, y});
            selectedToken = null;
        } else {
            selectedToken = {x, y};
        }
    } else {
        selectedToken = {x, y};
    }
    render();
});

// Check if two tokens are adjacent
function isAdjacent(token1, token2) {
    const dx = Math.abs(token1.x - token2.x);
    const dy = Math.abs(token1.y - token2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

// Swap two tokens
function swapTokens(pos1, pos2) {
    // Swap in grid
    let temp = grid[pos1.x][pos1.y];
    grid[pos1.x][pos1.y] = grid[pos2.x][pos2.y];
    grid[pos2.x][pos2.y] = temp;

    // Check for matches
    let matches = findMatches();
    if (matches.length > 0) {
        movesLeft--;
        processMatches(matches);
        updateUI();
        checkGameOver();
    } else {
        // Swap back if no matches
        temp = grid[pos1.x][pos1.y];
        grid[pos1.x][pos1.y] = grid[pos2.x][pos2.y];
        grid[pos2.x][pos2.y] = temp;
    }
    render();
}

// Find all matches on the grid
function findMatches() {
    let matches = [];

    // Horizontal matches
    for (let y = 0; y < GRID_SIZE; y++) {
        let matchLength = 1;
        for (let x = 1; x < GRID_SIZE; x++) {
            if (grid[x][y].type === grid[x - 1][y].type) {
                matchLength++;
            } else {
                if (matchLength >= 3) {
                    for (let i = 0; i < matchLength; i++) {
                        matches.push({x: x - 1 - i, y: y});
                    }
                }
                matchLength = 1;
            }
        }
        if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
                matches.push({x: GRID_SIZE - 1 - i, y: y});
            }
        }
    }

    // Vertical matches
    for (let x = 0; x < GRID_SIZE; x++) {
        let matchLength = 1;
        for (let y = 1; y < GRID_SIZE; y++) {
            if (grid[x][y].type === grid[x][y - 1].type) {
                matchLength++;
            } else {
                if (matchLength >= 3) {
                    for (let i = 0; i < matchLength; i++) {
                        matches.push({x: x, y: y - 1 - i});
                    }
                }
                matchLength = 1;
            }
        }
        if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
                matches.push({x: x, y: GRID_SIZE - 1 - i});
            }
        }
    }

    // Remove duplicates
    matches = matches.filter((v, i, a) => a.findIndex(t => (t.x === v.x && t.y === v.y)) === i);

    return matches;
}

// Check if any matches exist (used during initialization)
function hasAnyMatches() {
    return findMatches().length > 0;
}

// Process matched tokens
function processMatches(matches) {
    // Determine special tokens based on match length and pattern
    let specialTokens = determineSpecialTokens(matches);

    // Remove matched tokens
    matches.forEach(pos => {
        // If this position is to be replaced by a special token, skip removal
        if (specialTokens.find(st => st.x === pos.x && st.y === pos.y)) return;
        grid[pos.x][pos.y] = null;
    });

    // Apply special token effects
    specialTokens.forEach(token => {
        activateSpecialToken(token);
    });

    // Update score
    let pointsEarned = matches.length * 10;
    score += pointsEarned;

    // Drop tokens
    dropTokens();

    // Find new matches (cascading)
    let newMatches = findMatches();
    if (newMatches.length > 0) {
        setTimeout(() => {
            processMatches(newMatches);
            updateUI();
            render();
        }, 500); // Delay for visual effect
    }
}

// Determine special tokens based on match patterns
function determineSpecialTokens(matches) {
    let specialTokens = [];

    // Group matches by rows and columns
    let rowGroups = {};
    let colGroups = {};

    matches.forEach(pos => {
        if (!rowGroups[pos.y]) rowGroups[pos.y] = [];
        rowGroups[pos.y].push(pos.x);

        if (!colGroups[pos.x]) colGroups[pos.x] = [];
        colGroups[pos.x].push(pos.y);
    });

    // Identify special tokens in rows
    Object.keys(rowGroups).forEach(y => {
        let xs = rowGroups[y].sort((a, b) => a - b);
        let count = 1;
        for (let i = 1; i < xs.length; i++) {
            if (xs[i] === xs[i - 1] + 1) {
                count++;
                if (count === 4) {
                    // Create CoinBomb
                    specialTokens.push({x: xs[i], y: parseInt(y), type: 'CoinBomb'});
                }
                if (count === 5) {
                    // Create TokenMiner
                    specialTokens.push({x: xs[i], y: parseInt(y), type: 'TokenMiner'});
                }
            } else {
                count = 1;
            }
        }
    });

    // Identify special tokens in columns
    Object.keys(colGroups).forEach(x => {
        let ys = colGroups[x].sort((a, b) => a - b);
        let count = 1;
        for (let i = 1; i < ys.length; i++) {
            if (ys[i] === ys[i - 1] + 1) {
                count++;
                if (count === 4) {
                    // Create CoinBomb
                    specialTokens.push({x: parseInt(x), y: ys[i], type: 'CoinBomb'});
                }
                if (count === 5) {
                    // Create TokenMiner
                    specialTokens.push({x: parseInt(x), y: ys[i], type: 'TokenMiner'});
                }
            } else {
                count = 1;
            }
        }
    });

    // Detect T-shaped or L-shaped matches for CryptoExploder (Advanced)
    // Note: This implementation is simplified and may not cover all cases
    // For full detection, more complex pattern recognition is required
    // Here, we assume that if a token is part of both a horizontal and vertical match, it's the center of a T-shape
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (matches.some(m => m.x === x && m.y === y)) {
                // Check if the token is part of both a horizontal and vertical match
                let horizontal = rowGroups[y] && rowGroups[y].length >= 3 && rowGroups[y].includes(x);
                let vertical = colGroups[x] && colGroups[x].length >= 3 && colGroups[x].includes(y);
                if (horizontal && vertical) {
                    specialTokens.push({x: x, y: y, type: 'CryptoExploder'});
                }
            }
        }
    }

    // Remove duplicate special tokens
    specialTokens = specialTokens.filter((v, i, a) => a.findIndex(t => (t.x === v.x && t.y === v.y && t.type === v.type)) === i);

    // Apply special tokens to the grid
    specialTokens.forEach(st => {
        grid[st.x][st.y].isSpecial = true;
        grid[st.x][st.y].specialType = st.type;
    });

    return specialTokens;
}

// Activate special token effects
function activateSpecialToken(token) {
    switch(token.specialType) {
        case 'CoinBomb':
            destroyRowOrColumn(token);
            break;
        case 'TokenMiner':
            destroyAllOfType(token.type);
            break;
        case 'CryptoExploder':
            destroyArea(token.x, token.y);
            break;
        default:
            break;
    }
}

// Destroy an entire row or column based on CoinBomb
function destroyRowOrColumn(token) {
    // Randomly decide to destroy a row or a column
    if (Math.random() < 0.5) {
        // Destroy row
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[x][token.y]) {
                grid[x][token.y] = null;
                score += 10;
            }
        }
    } else {
        // Destroy column
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[token.x][y]) {
                grid[token.x][y] = null;
                score += 10;
            }
        }
    }
}

// Destroy all tokens of a specific type based on TokenMiner
function destroyAllOfType(type) {
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[x][y].type === type && !grid[x][y].isSpecial) {
                grid[x][y] = null;
                score += 10;
            }
        }
    }
}

// Destroy a 3x3 area based on CryptoExploder
function destroyArea(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            let targetX = x + dx;
            let targetY = y + dy;
            if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
                if (grid[targetX][targetY] && !grid[targetX][targetY].isSpecial) {
                    grid[targetX][targetY] = null;
                    score += 10;
                }
            }
        }
    }
}

// Drop tokens after matches
function dropTokens() {
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = GRID_SIZE - 1; y >= 0; y--) {
            if (grid[x][y] === null) {
                // Find the nearest non-null token above
                let ty = y - 1;
                while (ty >= 0 && grid[x][ty] === null) {
                    ty--;
                }
                if (ty >= 0) {
                    grid[x][y] = grid[x][ty];
                    grid[x][ty] = null;
                    grid[x][y].y = y;
                } else {
                    // If no token found, generate a new one
                    grid[x][y] = new Token(x, y, getRandomType());
                }
            }
        }
    }
}

// Update UI elements
function updateUI() {
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('moves').innerText = `Moves Left: ${movesLeft}`;
    document.getElementById('objective').innerText = `Objective: Earn ${objective} Points`;
    document.getElementById('currency').innerText = `Tokens: ${currency}`;
}

// Check Game Over Conditions
function checkGameOver() {
    if (score >= objective) {
        setTimeout(() => {
            alert('Congratulations! You have completed the level.');
            gameOver = true;
        }, 100);
    } else if (movesLeft <= 0) {
        setTimeout(() => {
            alert('Game Over! You have no more moves left.');
            gameOver = true;
        }, 100);
    }
}

// Shop Buttons Event Listeners
document.getElementById('buyExtraMoves').addEventListener('click', function() {
    if (currency >= 100) {
        currency -= 100;
        movesLeft += 5;
        updateUI();
        alert('5 Extra Moves Purchased!');
    } else {
        alert('Not enough tokens!');
    }
});

document.getElementById('buyCryptoSwap').addEventListener('click', function() {
    if (currency >= 150) {
        currency -= 150;
        cryptoSwapActive = true;
        swapSelection = [];
        updateUI();
        alert('Crypto Swap Activated! Select two tokens to swap.');
    } else {
        alert('Not enough tokens!');
    }
});

document.getElementById('buyCryptoHammer').addEventListener('click', function() {
    if (currency >= 200) {
        currency -= 200;
        cryptoHammerActive = true;
        updateUI();
        alert('Crypto Hammer Activated! Click on a token to remove it.');
    } else {
        alert('Not enough tokens!');
    }
});

// Handle Crypto Swap
function handleCryptoSwap(x, y) {
    swapSelection.push({x, y});
    highlightToken(x, y);

    if (swapSelection.length === 2) {
        let pos1 = swapSelection[0];
        let pos2 = swapSelection[1];
        swapTokens(pos1, pos2);
        cryptoSwapActive = false;
        swapSelection = [];
    }
}

// Handle Crypto Hammer
function handleCryptoHammer(x, y) {
    if (grid[x][y].isSpecial) {
        alert('Cannot remove a special token!');
        return;
    }
    grid[x][y] = null;
    score += 50; // Bonus points for using hammer
    dropTokens();
    render();
    updateUI();
    cryptoHammerActive = false;
    checkGameOver();
}

// Highlight selected tokens during boosters
function highlightToken(x, y) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x * TOKEN_SIZE, y * TOKEN_SIZE, TOKEN_SIZE, TOKEN_SIZE);
    // Optional: Add more visual feedback
}

// Initialize the Game
function startGame() {
    initGrid();
    render();
    updateUI();
}

// Start the game when the window loads
window.onload = startGame;
