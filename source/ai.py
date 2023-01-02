import random, copy
import numpy as np
from const import *
from game import Game
from piece import *
from itertools import compress 

class AI:
    def __init__(self, color):
        self.color = color
        self.player_color = 'white' if self.color == 'black' else 'black'
        self.game = Game()

    def choose_move(self, board, ai_moves):
        move_scores = np.array([], dtype= int)
        all_moves = []
        for move in ai_moves:
            if self.ai_check(board, move):
                all_moves.append(move)
        if len(all_moves) > 0:
            for move in all_moves:
                piece = board.squares[move.initial.row][move.initial.col].piece
                # decrease move score if a move does not prevent capture of a valuable piece
                move_score = self.move_material_value(board, piece, move)
                move_scores = np.append(move_scores, move_score)
            best_move_score = np.max(move_scores)
            best_move_score_list = move_scores == best_move_score
            best_move_score_list = list(compress(range(len(best_move_score_list)), best_move_score_list)) 
            move = all_moves[random.choice(best_move_score_list)]
            piece = board.squares[move.initial.row][move.initial.col].piece
            return (move, piece)
        return (None, None)

    def make_move(self, board, move, piece):
        final_row = move.final.row
        final_col = move.final.col
        captured = not board.squares[final_row][final_col].isempty() 
        board.move(piece, move) 
        # sounds
        self.game.play_sound(captured)

    def find_player_moves(self, board, move):
        player_moves = []
        temp_board = copy.deepcopy(board)
        piece = board.squares[move.initial.row][move.initial.col].piece
        temp_board.move(piece, move)
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_team_piece(self.player_color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=False)
                    for m in p.moves:
                        player_moves.append(m)
        return player_moves

    def ai_check(self, board, move):
        player_moves = self.find_player_moves(board, move)
        for move in player_moves:
            if isinstance(move.final.piece, King):
                return False
        return True

    # AI move evaluation
    def move_material_value(self, board, piece, move):
        final_square = board.squares[move.final.row][move.final.col]
        move_score = 0
        # strongly encourage checkmate
        player_moves = self.find_player_moves(board, move)
        if len(player_moves) == 0:
                return 100
        # encourage checking player king and checkmating
        if board.giving_check(piece, move):
                move_score += 0.5
        # encourage capture of player pieces
        if final_square.has_enemy_piece(self.color):
                move_score += final_square.piece.value
        
        # Loop through immediate player response moves
        temp_board = copy.deepcopy(board)
        for player_move in player_moves:
            player_final_square = temp_board.squares[player_move.final.row][player_move.final.col]
            # discourage move when a valuable piece can be captured
            if player_final_square == final_square:    
                move_score -= piece.value
        return move_score
        