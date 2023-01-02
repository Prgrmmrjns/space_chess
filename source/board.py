from const import *
from square import Square
from piece import *
from move import Move
from sound import Sound
import copy, os

class Board:

    def __init__(self):
        self.squares = [[0, 0, 0, 0, 0, 0, 0, 0] for col in range(COLS)]
        self.last_move = None
        self._initiate()

    def move(self, piece, move):
        initial = move.initial
        final = move.final
        en_passant_empty = self.squares[final.row][final.col].isempty()
        # console board move update
        self.squares[initial.row][initial.col].piece = None
        self.squares[final.row][final.col].piece = piece

        if isinstance(piece, Pawn):
            # en passant capture
            diff = final.col - initial.col
            if diff != 0 and en_passant_empty:
                # console board move update
                self.squares[initial.row][initial.col + diff].piece = None
                self.squares[final.row][final.col].piece = piece
                sound = Sound(
                    os.path.join('assets/sounds/capture.wav'))
                sound.play()
            
            # pawn promotion
            else:
                self.check_promotion(piece, final)

        if isinstance(piece, King):
            rowK = 0 if piece.color == "black" else 7
            if initial.col == 4 and final.col == 2:
                self.squares[rowK][0].piece = None
                self.squares[rowK][3].piece = Rook(color=piece.color)

            if initial.col == 4 and final.col == 6:
                self.squares[rowK][7].piece = None
                self.squares[rowK][5].piece = Rook(color=piece.color)

        # move
        piece.moved = True
        # clear valid moves
        piece.clear_moves()
        # set last move
        self.last_move = move

    def valid_move(self, piece, move):
        return move in piece.moves

    def find_moves(self, color):
        moves = []
        for row in range(ROWS):
            for col in range(COLS):
                if self.squares[row][col].has_team_piece(color):
                    p = self.squares[row][col].piece
                    self.calc_moves(p, row, col, bool=False)
                    for move in p.moves:
                        moves.append(move)
        return moves
    
    def set_true_en_passant(self, piece):
        
        if not isinstance(piece, Pawn):
            return

        for row in range(ROWS):
            for col in range(COLS):
                if isinstance(self.squares[row][col].piece, Pawn):
                    self.squares[row][col].piece.en_passant = False
        
        piece.en_passant = True

    def check_promotion(self, piece, final):
        if final.row == 0 or final.row == 7:
            self.squares[final.row][final.col].piece = Queen(piece.color)

    def borders_enemy_king(self, move, color):
        row_range = (move.final.row-1,move.final.row,move.final.row+1)
        col_range = (move.final.col-1, move.final.col,move.final.col+1)
        king_field = []
        for row in row_range:
            if Square.in_range(row):
                for col in col_range:
                    if Square.in_range(col):
                        if self.squares[row][col].has_enemy_piece(color) and isinstance(self.squares[row][col].piece, King):
                            king_field.append((row, col))
        if len(king_field) == 0:
            return True
        else:
            return False
    
    def in_check(self, piece, move):
        temp_piece = copy.deepcopy(piece)
        temp_board = copy.deepcopy(self)
        temp_board.move(temp_piece, move)
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_enemy_piece(piece.color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=False)
                    for m in p.moves:
                        if isinstance(m.final.piece, King):
                            return True
        return False

    def giving_check(self, piece, move):
        temp_piece = copy.deepcopy(piece)
        temp_board = copy.deepcopy(self)
        temp_board.move(temp_piece, move)
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_team_piece(piece.color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=False)
                    for m in p.moves:
                        if isinstance(m.final.piece, King):
                            return True
        return False
    
    def check_condition(self, giving_check, color, mode, username):
        temp_board = copy.deepcopy(self)
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_enemy_piece(color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=True)
                    for m in p.moves:
                        if self.valid_move(p, m):
                            return "Ongoing"
        if giving_check:
            if mode =='aivsai':
                return f'Checkmate. {username.title()} won.'
            else:
                return f'Checkmate. {color.title()} won.'
        else:
            "Draw"

    def calc_moves(self, piece, row, col, bool=True, mode=False):
        def pawn_moves():
            # steps
            steps = 1 if piece.moved else 2

            # vertical moves
            start = row + piece.dir
            end = row + (piece.dir * (1 + steps))
            for possible_move_row in range(start, end, piece.dir):
                if Square.in_range(possible_move_row):
                    if self.squares[possible_move_row][col].isempty():
                        # create initial and final move squares
                        initial = Square(row, col)
                        final = Square(possible_move_row, col)
                        move = Move(initial, final)

                        # check potencial checks
                        if bool:
                            if not self.in_check(piece, move):
                                piece.add_move(move)
                        else:
                            piece.add_move(move)
                    # blocked
                    else: break
                # not in range
                else: break

            # diagonal moves
            possible_move_row = row + piece.dir
            possible_move_cols = [col-1, col+1]
            for possible_move_col in possible_move_cols:
                if Square.in_range(possible_move_row, possible_move_col):
                    if self.squares[possible_move_row][possible_move_col].has_enemy_piece(piece.color):
                        # create initial and final move squares
                        initial = Square(row, col)
                        final_piece = self.squares[possible_move_row][possible_move_col].piece
                        final = Square(possible_move_row, possible_move_col, final_piece)
                        move = Move(initial, final)
                        
                        # check potencial checks
                        if bool:
                            if not self.in_check(piece, move):
                                piece.add_move(move)
                        else:
                            piece.add_move(move)
            
            # en passant moves
            r = 3 if piece.color == 'white' else 4
            fr = 2 if piece.color == 'white' else 5
            # left en pessant
            if Square.in_range(col-1) and row == r:
                if self.squares[row][col-1].has_enemy_piece(piece.color):
                    p = self.squares[row][col-1].piece
                    if isinstance(p, Pawn):
                        if p.en_passant:
                            # create initial and final move squares
                            initial = Square(row, col)
                            final = Square(fr, col-1, p)
                            # create a new move
                            move = Move(initial, final)
                            
                            # check potencial checks
                            if bool:
                                if not self.in_check(piece, move):
                                    # append new move
                                    piece.add_move(move)
                            else:
                                # append new move
                                piece.add_move(move)
            
            # right en pessant
            if Square.in_range(col+1) and row == r:
                if self.squares[row][col+1].has_enemy_piece(piece.color):
                    p = self.squares[row][col+1].piece
                    if isinstance(p, Pawn):
                        if p.en_passant:
                            # create initial and final move squares
                            initial = Square(row, col)
                            final = Square(fr, col+1, p)
                            # create a new move
                            move = Move(initial, final)
                            
                            # check potencial checks
                            if bool:
                                if not self.in_check(piece, move):
                                    # append new move
                                    piece.add_move(move)
                            else:
                                # append new move
                                piece.add_move(move)

        def knight_moves():
            for possible_move in [(row-2, col+1),(row-1, col+2),(row+1, col+2),(row+2, col+1),
                (row+2, col-1),(row+1, col-2),(row-1, col-2),(row-2, col-1),]:
                possible_move_row, possible_move_col = possible_move

                if Square.in_range(possible_move_row, possible_move_col) and self.squares[possible_move_row][possible_move_col].isempty_or_enemy(piece.color):
                    # create squares of the new move
                    initial = Square(row, col)
                    final_piece = self.squares[possible_move_row][possible_move_col].piece
                    final = Square(possible_move_row, possible_move_col, final_piece)
                    move = Move(initial, final)
                    
                    # check potencial checks
                    if bool:
                        if not self.in_check(piece, move):
                            piece.add_move(move)
                    else:
                        piece.add_move(move)

        def straightline_moves(incrs):
            for incr in incrs:
                row_incr, col_incr = incr
                possible_move_row = row + row_incr
                possible_move_col = col + col_incr

                while True:
                    if Square.in_range(possible_move_row, possible_move_col):
                        # create squares of the possible new move
                        initial = Square(row, col)
                        final_piece = self.squares[possible_move_row][possible_move_col].piece
                        final = Square(possible_move_row, possible_move_col, final_piece)
                        # create a possible new move
                        move = Move(initial, final)

                        # empty = continue looping
                        if self.squares[possible_move_row][possible_move_col].isempty():
                            # check potencial checks
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)

                        # has enemy piece = add move + break
                        elif self.squares[possible_move_row][possible_move_col].has_enemy_piece(piece.color):
                            # check potencial checks
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)
                            break

                        # has team piece = break
                        elif self.squares[possible_move_row][possible_move_col].has_team_piece(piece.color):
                            break
                    
                    # not in range
                    else: break

                    # incrementing incrs
                    possible_move_row = possible_move_row + row_incr
                    possible_move_col = possible_move_col + col_incr

        def king_moves():
            # normal moves
            for possible_move in [(row-1, col+0), (row-1, col+1), (row+0, col+1), (row+1, col+1), 
                (row+1, col+0), (row+1, col-1), (row+0, col-1), (row-1, col-1)]:
                possible_move_row, possible_move_col = possible_move

                if Square.in_range(possible_move_row, possible_move_col):
                    if self.squares[possible_move_row][possible_move_col].isempty_or_enemy(piece.color):
                        # create squares of the new move
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col) 
                        move = Move(initial, final)
                        if self.borders_enemy_king(move, piece.color):
                            # check potencial checks
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)

            # castling moves
            if not piece.moved:
                rowK = 0 if piece.color == "black" else 7
                # king castling
                if self.squares[rowK][6].isempty() and self.squares[rowK][5].isempty() and isinstance(self.squares[rowK][7].piece, Rook):
                    initialK = Square(rowK, 4)
                    finalK = Square(rowK, 6) 
                    moveK = Move(initialK, finalK)
                    # check potencial checks
                    if bool:
                        if not self.in_check(piece, moveK):
                            piece.add_move(moveK)
                    else:
                        piece.add_move(moveK)

                # queen castling
                if self.squares[rowK][3].isempty() and self.squares[rowK][2].isempty() and self.squares[rowK][1].isempty() and isinstance(self.squares[rowK][7].piece, Rook):
                    initialK = Square(rowK, 4)
                    finalK = Square(rowK, 2) 
                    moveK = Move(initialK, finalK)
                    # check potencial checks
                    if bool:
                        if not self.in_check(piece, moveK):
                            piece.add_move(moveK)
                    else:
                        piece.add_move(moveK)

        if isinstance(piece, Pawn): 
            pawn_moves()

        elif isinstance(piece, Knight): 
            knight_moves()

        elif isinstance(piece, Bishop): 
            straightline_moves([(-1, 1), (-1, -1), (1, 1), (1, -1)])

        elif isinstance(piece, Rook): 
            straightline_moves([(-1, 0),(0, 1), (1, 0), (0, -1)])

        elif isinstance(piece, Queen): 
            straightline_moves([(-1, 1),(-1, -1), (1, 1), (1, -1), 
                (-1, 0),(0, 1), (1, 0), (0, -1)])

        elif isinstance(piece, King): 
            king_moves()

    def _initiate(self):
        # initiate square
        for row in range(ROWS):
            for col in range(COLS):
                self.squares[row][col] = Square(row, col)
        # add pieces
        for color in ('white', 'black'):
            row_pawn, row_other = (6, 7) if color == 'white' else (1, 0)
            # pawns
            for col in range(COLS):
                self.squares[row_pawn][col] = Square(row_pawn, col, Pawn(color))
            # knights
            self.squares[row_other][1] = Square(row_other, 1, Knight(color))
            self.squares[row_other][6] = Square(row_other, 6, Knight(color))
            # bishops
            self.squares[row_other][2] = Square(row_other, 2, Bishop(color))
            self.squares[row_other][5] = Square(row_other, 5, Bishop(color))
            # rooks
            self.squares[row_other][0] = Square(row_other, 0, Rook(color))
            self.squares[row_other][7] = Square(row_other, 7, Rook(color))
            # queen
            self.squares[row_other][3] = Square(row_other, 3, Queen(color))
            # king
            self.squares[row_other][4] = Square(row_other, 4, King(color))