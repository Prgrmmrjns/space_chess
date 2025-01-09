import random, copy
import numpy as np
from const import *
from game import Game
from piece import *
from itertools import compress 

class AI:
    def __init__(self, color, strategy):
        self.color = color
        self.strategy = strategy
        self.player_color = 'white' if self.color == 'black' else 'black'
        self.game = Game()

    def make_move(self, board, repeats):
        move_scores = np.array([])
        all_moves = []
        best_move_score = - 10
        for row in range(ROWS):
            for col in range(COLS):
                if board.squares[row][col].has_team_piece(self.color):
                    piece = board.squares[row][col].piece
                    board.calc_moves(piece, row, col, bool=False)
                    for move in piece.moves:
                        valid, enemy_moves = self.valid_move(board, move, piece)
                        if valid:
                            # Choose strategy
                            if self.strategy == "random":
                                move_score = 0
                            elif self.strategy == "hard_code":
                                move_score = self.evaluate_move(board, move, piece, enemy_moves, repeats)
                            if move_score == best_move_score:
                                best_move_score = move_score
                                all_moves.append(move)
                                move_scores = np.append(move_scores, move_score)
                            elif move_score > best_move_score:
                                best_move_score = move_score
                                all_moves = [move]
                                move_scores = np.array([move_score])
        best_move_score_list = move_scores == best_move_score
        move = all_moves[random.choice(list(compress(range(len(best_move_score_list)), best_move_score_list)))]
        piece = board.squares[move.initial.row][move.initial.col].piece
        board.move(piece, move) 
        # sounds
        self.game.play_sound(board.squares[move.final.row][move.final.col].isempty())
        return board.giving_check(piece, move)

    # Check if move is valid and also store enemy moves when valid
    def valid_move(self, board, move, piece):
        temp_board = copy.deepcopy(board)
        temp_board.move(piece, move)
        enemy_moves  = []
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_enemy_piece(self.color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=False)
                    for move in p.moves:
                        if isinstance(move.final.piece, King):
                                return False, 0
                    enemy_moves.extend(p.moves)
        return True, enemy_moves

    # AI evaluation method
    def evaluate_move(self, board, move, piece, enemy_moves, repeats):
        move_score = 0
        final_square = move.final
        piece_count = 0
        for row in range(ROWS):
            for col in range(COLS):
                if not board.squares[row][col].isempty():
                    piece_count += 1
        if final_square.piece is not None: 
                move_score += final_square.piece.value
        highest_loss = 0
        if board.giving_check(piece, move):
            if board.check_condition(True, self.color, repeats) != "Ongoing":
                return 100
        if isinstance(piece, Pawn) and piece_count < 10:
            if move.final.row in [0,7]:
                move_score += 3
            move_score += 0.5
            if len(enemy_moves) < 20:
                move_score += 0.5
        for enemy_move in enemy_moves:
            piece = board.squares[enemy_move.initial.row][enemy_move.initial.col].piece
            enemy_capture = enemy_move.final.piece
            if enemy_capture is not None:
                if enemy_capture.value > highest_loss:
                    highest_loss = enemy_capture.value
        move_score -= highest_loss
        return move_score
