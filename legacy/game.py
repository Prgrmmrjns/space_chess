import pygame
from const import *
from board import Board
from dragger import Dragger
from config import Config
from sound import Sound
import os

class Game:

    def __init__(self):
        self.next_player = 'white'
        self.board = Board()
        self.dragger = Dragger()
        self.config = Config()

    def show_screen(self, surface, giving_check, turn):
        theme = self.config.theme

        # Draw the board
        for row in range(ROWS):
            for col in range(COLS):
                # Color
                color = theme.bg.light if (row + col) % 2 == 0 else theme.bg.dark
                rect = (col * SQSIZE, row * SQSIZE, SQSIZE, SQSIZE)
                pygame.draw.rect(surface, color, rect)

                # Space elements
                square = self.board.squares[row][col]
                space_element_color = square.get_space_element_color()
                if space_element_color:
                    # Draw space elements with a circular shape
                    center = (col * SQSIZE + SQSIZE // 2, row * SQSIZE + SQSIZE // 2)
                    if square.has_black_hole:
                        # Black hole is drawn as a larger circle with a dark center
                        pygame.draw.circle(surface, space_element_color, center, SQSIZE // 2)
                        pygame.draw.circle(surface, (0, 0, 0), center, SQSIZE // 3)
                    elif square.has_planet:
                        # Planets are drawn as medium circles
                        pygame.draw.circle(surface, space_element_color, center, SQSIZE // 2.5)
                    elif square.has_asteroid:
                        # Asteroids are drawn as smaller circles
                        pygame.draw.circle(surface, space_element_color, center, SQSIZE // 3)
                    elif square.is_wormhole:
                        # Wormholes are drawn as concentric circles with different colors
                        pygame.draw.circle(surface, space_element_color, center, SQSIZE // 2)  # Outer circle
                        inner_color = square.get_wormhole_inner_color()
                        if inner_color:
                            pygame.draw.circle(surface, inner_color, center, SQSIZE // 3)  # Inner circle

                # Pieces
                if square.has_piece():
                    piece = square.piece
                    if piece is not self.dragger.piece:
                        piece.set_texture(size=SQSIZE)
                        img = pygame.image.load(piece.texture)
                        img_center = col * SQSIZE + SQSIZE // 2, row * SQSIZE + SQSIZE // 2
                        piece.texture_rect = img.get_rect(center=img_center)
                        surface.blit(img, piece.texture_rect)

        # Draw the sidebar
        self.show_sidebar(surface)

    def show_sidebar(self, surface):
        # Draw sidebar background
        sidebar_rect = (BOARD_WIDTH, 0, SIDEBAR_WIDTH, HEIGHT)
        pygame.draw.rect(surface, (30, 30, 30), sidebar_rect)  # Dark gray background

        # Font setup
        font = pygame.font.Font(None, 36)
        small_font = pygame.font.Font(None, 24)

        # Load and display civilization images if they exist
        if hasattr(self, 'player_civ') and hasattr(self, 'ai_civ'):
            # Display AI civilization on top
            ai_text = font.render("AI Civilization:", True, (255, 255, 255))
            surface.blit(ai_text, (BOARD_WIDTH + 20, 20))
            
            ai_civ_name = font.render(CIVILIZATION_NAMES[self.ai_civ], True, (255, 255, 255))
            surface.blit(ai_civ_name, (BOARD_WIDTH + 20, 60))

            if hasattr(self, 'civ_images') and self.ai_civ in self.civ_images:
                ai_img = pygame.transform.scale(self.civ_images[self.ai_civ], (250, 250))
                surface.blit(ai_img, (BOARD_WIDTH + 25, 100))

            # Display player civilization on bottom
            player_text = font.render("Player Civilization:", True, (255, 255, 255))
            surface.blit(player_text, (BOARD_WIDTH + 20, HEIGHT // 2))
            
            player_civ_name = font.render(CIVILIZATION_NAMES[self.player_civ], True, (255, 255, 255))
            surface.blit(player_civ_name, (BOARD_WIDTH + 20, HEIGHT // 2 + 40))

            if hasattr(self, 'civ_images') and self.player_civ in self.civ_images:
                player_img = pygame.transform.scale(self.civ_images[self.player_civ], (250, 250))
                surface.blit(player_img, (BOARD_WIDTH + 25, HEIGHT // 2 + 80))

        # Add buttons at the bottom of sidebar
        button_height = 40
        button_width = SIDEBAR_WIDTH - 40
        button_y = HEIGHT - 140  # Position for back button, moved up to make room for quit
        
        # Back button
        back_rect = pygame.Rect(BOARD_WIDTH + 20, button_y, button_width, button_height)
        pygame.draw.rect(surface, (50, 50, 50), back_rect)
        back_text = font.render("Back to Menu (M)", True, (255, 255, 255))
        text_rect = back_text.get_rect(center=back_rect.center)
        surface.blit(back_text, text_rect)
        
        # Restart button
        restart_rect = pygame.Rect(BOARD_WIDTH + 20, button_y + button_height + 10, button_width, button_height)
        pygame.draw.rect(surface, (50, 50, 50), restart_rect)
        restart_text = font.render("Restart Game (R)", True, (255, 255, 255))
        text_rect = restart_text.get_rect(center=restart_rect.center)
        surface.blit(restart_text, text_rect)

        # Quit button
        quit_rect = pygame.Rect(BOARD_WIDTH + 20, button_y + 2 * (button_height + 10), button_width, button_height)
        pygame.draw.rect(surface, (50, 50, 50), quit_rect)
        quit_text = font.render("Quit Game (ESC)", True, (255, 255, 255))
        text_rect = quit_text.get_rect(center=quit_rect.center)
        surface.blit(quit_text, text_rect)

    def set_civilizations(self, player_civ, ai_civ, civ_images):
        self.player_civ = player_civ
        self.ai_civ = ai_civ
        self.civ_images = civ_images

    def show_moves(self, surface):
        theme = self.config.theme

        if self.dragger.dragging:
            piece = self.dragger.piece

            # Loop all valid moves
            for move in piece.moves:
                # Color
                color = theme.moves.light if (move.final.row + move.final.col) % 2 == 0 else theme.moves.dark
                # Rect
                rect = (move.final.col * SQSIZE, move.final.row * SQSIZE, SQSIZE, SQSIZE)
                # Blit
                pygame.draw.rect(surface, color, rect)

    def show_last_move(self, surface):
        theme = self.config.theme

        if self.board.last_move:
            initial = self.board.last_move.initial
            final = self.board.last_move.final

            for pos in [initial, final]:
                # Color
                color = theme.trace.light if (pos.row + pos.col) % 2 == 0 else theme.trace.dark
                # Rect
                rect = (pos.col * SQSIZE, pos.row * SQSIZE, SQSIZE, SQSIZE)
                # Blit
                pygame.draw.rect(surface, color, rect)

    def show_hover(self, surface):
        if self.dragger.mouseX < 0 or self.dragger.mouseY < 0:
            return

        theme = self.config.theme
        row = self.dragger.mouseY // SQSIZE
        col = self.dragger.mouseX // SQSIZE

        # In range and has piece
        if Square.in_range(row, col) and self.board.squares[row][col].has_piece():
            # Color
            color = theme.hover.light if (row + col) % 2 == 0 else theme.hover.dark
            # Rect
            rect = (col * SQSIZE, row * SQSIZE, SQSIZE, SQSIZE)
            # Blit
            pygame.draw.rect(surface, color, rect)

    def set_hover(self, row, col):
        self.hover_row = row
        self.hover_col = col

    def next_turn(self):
        self.next_player = 'white' if self.next_player == 'black' else 'black'

    def reset(self):
        self.__init__()