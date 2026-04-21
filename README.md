# NP Tic Tac Toe

## Game Mechanics

The NP Tic Tac Toe is a two-player game where players take turns placing their marks (X and O) in a 3x3 grid. The objective is to align three marks in a horizontal, vertical, or diagonal row before the opponent does. 

- Players alternate turns.
- A player wins by placing three of their marks in a row.
- If all 9 squares are filled without a winner, the game ends in a draw.

## Architecture

The game is designed using a Model-View-Controller (MVC) architecture that separates the game's logic from the interface. This makes maintenance and scalability easier.

- **Model**: Stores the current state of the game, including player marks and win conditions.
- **View**: Presents the game board and player interactions.
- **Controller**: Handles user inputs and updates the Model accordingly.

## AI Engine Details

The AI player utilizes the Minimax algorithm, enabling it to make optimal decisions by considering all possible moves. The AI assesses each potential outcome to ensure that it plays both offensively and defensively:

- **Minimax Algorithm**: This algorithm evaluates the value of each board state and selects the move that maximizes the player's chances of winning.
- **Alpha-Beta Pruning**: An optimization to skip evaluating moves that won’t affect the final decision, improving efficiency.

## Quick Start Guide

1. Clone the repository:
   ```bash
   git clone https://github.com/nirmalya-iitkgp/np-tic-tac-toe.git
   ```
2. Navigate to the project directory:
   ```bash
   cd np-tic-tac-toe
   ```
3. Open the index.html file in your web browser.
4. Start playing!

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js (if applicable for further development)
- **Version Control**: Git

## Deployment Options

The application can be easily deployed using various platforms:
- **GitHub Pages** for static deployment.
- **Heroku** or **Vercel** for complete web applications if backend functionality is included.

## Technical Documentation

Refer to the [Wiki](link-to-wiki) for detailed technical documentation including code comments, architecture diagrams, and specific functionalities of the AI engine. 

For contributions, please adhere to the contribution guidelines to maintain the quality of the project.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---