import os

class Piece:

    def __init__(self, name, color, value, texture=None, texture_rect=None):
        self.name = name
        self.color = color
        self.moves = []
        
        # Set value for AI evaluation
        value_sign = 1 if color == 'white' else -1
        self.value = value * value_sign
        
        # Get the correct image path using config
        self.set_texture()
        self.texture_rect = texture_rect
    
    def set_texture(self, size=80):
        from config import Config  # Import here to avoid circular import
        config = Config()
        
        # Construct the image filename
        filename = f'{self.color}_{self.name}.png'
        self.texture = os.path.join(config.imgs_path, filename)

    def add_move(self, move):
        self.moves.append(move)

    def clear_moves(self):
        self.moves = []

class Pawn(Piece):

    def __init__(self, color):
        self.dir = -1 if color == 'white' else 1
        self.en_passant = False
        self.moved = False
        super().__init__('pawn', color, 1)

class Knight(Piece):

    def __init__(self, color):
        super().__init__('knight', color, 3)

class Bishop(Piece):

    def __init__(self, color):
        super().__init__('bishop', color, 3.5)

class Rook(Piece):

    def __init__(self, color):
        self.moved = False
        super().__init__('rook', color, 5)

class Queen(Piece):

    def __init__(self, color):
        super().__init__('queen', color, 9)

class King(Piece):

    def __init__(self, color):
        self.left_rook = None
        self.right_rook = None
        self.moved = False
        super().__init__('king', color, 100)