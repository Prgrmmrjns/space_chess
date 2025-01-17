# Space Chess

A unique chess variant that combines traditional chess with space elements like asteroids, planets, black holes, and wormholes.

## Features

- Three unique civilizations with special abilities:
  - Reptiloids: Can spawn extra pawns when capturing planets
  - Crustaceans: Can move asteroids to capture pieces
  - Blobs: Immune to black holes
- Space elements that affect gameplay:
  - Asteroids: Block movement and can be used strategically
  - Planets: Allow pawn spawning upon capture
  - Black Holes: Destroy pieces that land on or adjacent to them
  - Wormholes: Allow pieces to teleport between connected pairs
- Multiple game modes:
  - Player vs AI
  - Player vs Player
  - AI vs AI

## Running from Source

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Run the game:
```bash
python main.py
```

## Building the Executable

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Build the executable:
```bash
python build_exe.py
```

3. Find the executable in the `dist` folder:
- Windows: `dist/SpaceChess.exe`
- macOS: `dist/SpaceChess`
- Linux: `dist/SpaceChess`

The executable contains all necessary files and can be run on any computer with the same operating system, without requiring Python or any dependencies to be installed.

## Controls

- Use the mouse to select and move pieces
- Press 'R' to restart the game
- Press 'ESC' to quit

## Project Structure

- `main.py`: Main game file
- `build_exe.py`: Script to build the executable
- `assets/`: Game assets (images, sounds)
- `requirements.txt`: Python dependencies
