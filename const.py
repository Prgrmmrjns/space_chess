# Screen dimensions
BOARD_WIDTH = 1000
BOARD_HEIGHT = 1000
SIDEBAR_WIDTH = 300
WIDTH = BOARD_WIDTH + SIDEBAR_WIDTH
HEIGHT = BOARD_HEIGHT

# Board dimensions
ROWS = 16
COLS = 16
SQSIZE = BOARD_WIDTH // COLS

# Space elements
ASTEROID_COUNT = 8
PLANET_COUNT = 4
BLACK_HOLE_COUNT = 2
WORMHOLE_PAIRS = 2

# Civilization types
CIVILIZATION_REPTILOID = 'reptiloid'
CIVILIZATION_CRUSTACEAN = 'crustacean'
CIVILIZATION_BLOB = 'blob'

# Civilization display names
CIVILIZATION_NAMES = {
    CIVILIZATION_REPTILOID: 'Reptiloids',
    CIVILIZATION_CRUSTACEAN: 'Crustaceans',
    CIVILIZATION_BLOB: 'Blobs'
}

# Colors for space elements (RGB)
ASTEROID_COLOR = (139, 69, 19)  # Brown
PLANET_COLOR = (65, 105, 225)   # Royal Blue
BLACK_HOLE_COLOR = (75, 0, 130) # Indigo

# Planet colonization colors
PLANET_COLORS = {
    'white': (200, 200, 255),  # Light blue for white's planets
    'black': (128, 128, 255),  # Darker blue for black's planets
    None: (65, 105, 225)       # Default uncolonized planet color
}

# Wormhole colors (outer and inner for each pair)
WORMHOLE_COLORS = [
    {
        'outer': (148, 0, 211),  # Purple
        'inner': (255, 0, 255)   # Magenta
    },
    {
        'outer': (0, 191, 255),  # Deep Sky Blue
        'inner': (0, 255, 255)   # Cyan
    }
]