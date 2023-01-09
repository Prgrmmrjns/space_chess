import pygame
from const import *
from board import Board
from square import Square
from dragger import Dragger
from config import Config
from piece import *

class Game:
    def __init__(self):
        self.hovered_sqr = None
        self.board = Board()
        self.dragger = Dragger()
        self.config = Config()

    def show_screen(self, surface, giving_check, turn):
        theme = self.config.theme

        # show background
        for row in range(ROWS):
            for col in range(COLS):
                if giving_check:
                    if  isinstance(self.board.squares[row][col].piece, King) and self.board.squares[row][col].piece.color == turn:
                        rect = (col * SQSIZE, row * SQSIZE, SQSIZE, SQSIZE)
                        pygame.draw.rect(surface, '#C86464', rect)
                color = theme.bg.light if (row + col) % 2 == 0 else theme.bg.dark
                rect = (col * SQSIZE, row*SQSIZE, SQSIZE, SQSIZE)
                pygame.draw.rect(surface,color,rect)

                # row coordinates
                if col == 1:
                    color = theme.bg.dark if row % 2 == 0 else theme.bg.light
                    label = self.config.font.render(str(ROWS-row), 1, color)
                    label_pos = (0, row * SQSIZE)
                    surface.blit(label, label_pos)

                # col coordinates
                if row == 7:
                    color = theme.bg.dark if (row + col) % 2 == 0 else theme.bg.light
                    label = self.config.font.render(str(Square.get_alphacol(col)), 1, color)
                    label_pos = (col * SQSIZE + SQSIZE - 20, HEIGHT - 20)
                    surface.blit(label, label_pos)
        
        # show last move
        if self.board.last_move:
            initial = self.board.last_move.initial
            final = self.board.last_move.final

            for pos in [initial, final]:
                color = theme.trace.light if (pos.row + pos.col) % 2 == 0 else theme.trace.dark
                rect = (pos.col * SQSIZE, pos.row * SQSIZE, SQSIZE, SQSIZE)
                pygame.draw.rect(surface, color, rect)

        # when giving check king is marked
        if giving_check:
            for row in range(ROWS):
                for col in range(COLS):
                    if  isinstance(self.board.squares[row][col].piece, King) and self.board.squares[row][col].piece.color == turn:
                        rect = (col * SQSIZE, row * SQSIZE, SQSIZE, SQSIZE)
                        pygame.draw.rect(surface, '#C86464', rect)
                        break

        # show valid moves
        if self.dragger.dragging:
            piece = self.dragger.piece
            for move in piece.moves:
                # color
                color = theme.moves.light if (move.final.row + move.final.col) % 2 == 0 else theme.moves.dark
                # rect
                rect = (move.final.col * SQSIZE, move.final.row * SQSIZE, SQSIZE, SQSIZE)
                # blit
                pygame.draw.rect(surface, color, rect)

        # show pieces
        for row in range(ROWS):
            for col in range(COLS):
                # piece ?
                if not self.board.squares[row][col].isempty():
                    piece = self.board.squares[row][col].piece
                    
                    # blit all pieces except dragged ones
                    if piece is not self.dragger.piece:
                        piece.set_texture(size=80)
                        img = pygame.image.load(piece.texture)
                        img_center = col * SQSIZE + SQSIZE // 2, row * SQSIZE + SQSIZE // 2
                        piece.texture_rect = img.get_rect(center=img_center)
                        surface.blit(img, piece.texture_rect)

    def change_theme(self):
        self.config.change_theme()

    def play_sound(self, captured=False):
        if captured:
            self.config.capture_sound.play()
        else:
            self.config.move_sound.play()

    def reset(self):
        self.__init__()
        return True, 'white', [], 0