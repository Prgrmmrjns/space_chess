from const import *
from piece import Piece

class Square:

    def __init__(self, row, col, piece=None):
        self.row = row
        self.col = col
        self.piece = piece
        self.has_asteroid = False
        self.has_planet = False
        self.planet_owner = None  # None, 'white', or 'black'
        self.has_black_hole = False
        self.wormhole_id = None  # None if no wormhole, otherwise 0 or 1 for pair identification
        self.is_wormhole = False
        self.alphacol = self.get_alphacol()

    def __eq__(self, other):
        return self.row == other.row and self.col == other.col

    def has_piece(self):
        return self.piece != None

    def isempty(self):
        return not self.has_piece()

    def has_team_piece(self, color):
        return self.has_piece() and self.piece.color == color

    def has_enemy_piece(self, color):
        return self.has_piece() and self.piece.color != color

    def isempty_or_enemy(self, color):
        return self.isempty() or self.has_enemy_piece(color)

    @staticmethod
    def in_range(*args):
        for arg in args:
            if arg < 0 or arg >= ROWS:
                return False
        return True

    def get_alphacol(self):
        return chr(self.col + 97) if self.col < 26 else str(self.col)

    def get_space_element_color(self):
        if self.has_asteroid:
            return ASTEROID_COLOR
        elif self.has_planet:
            return PLANET_COLORS[self.planet_owner]  # Get color based on planet owner
        elif self.has_black_hole:
            return BLACK_HOLE_COLOR
        elif self.is_wormhole:
            return WORMHOLE_COLORS[self.wormhole_id]['outer']
        return None

    def get_wormhole_inner_color(self):
        if self.is_wormhole:
            return WORMHOLE_COLORS[self.wormhole_id]['inner']
        return None
