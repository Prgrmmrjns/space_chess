from const import *
from square import Square
from piece import *
from move import Move
from sound import Sound
import copy, os

class Board:

    def __init__(self):
        self.squares = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] for col in range(COLS)]
        self.last_move = None
        self.asteroid_positions = []
        self.planet_positions = []
        self.black_hole_positions = []  # Changed to list for multiple black holes
        self.wormhole_pairs = []
        self._initiate()

    def set_space_elements(self, asteroids, planets, black_holes, wormholes):
        self.asteroid_positions = asteroids
        self.planet_positions = planets
        self.black_hole_positions = black_holes
        self.wormhole_pairs = wormholes
        
        # Mark squares with space elements
        for row, col in self.asteroid_positions:
            self.squares[row][col].has_asteroid = True
        
        for row, col in self.planet_positions:
            self.squares[row][col].has_planet = True
            self.squares[row][col].planet_owner = None
            
        for row, col in self.black_hole_positions:
            self.squares[row][col].has_black_hole = True

        # Set wormhole pairs
        for pair_id, (pos1, pos2) in enumerate(self.wormhole_pairs):
            row1, col1 = pos1
            row2, col2 = pos2
            self.squares[row1][col1].is_wormhole = True
            self.squares[row1][col1].wormhole_id = pair_id
            self.squares[row2][col2].is_wormhole = True
            self.squares[row2][col2].wormhole_id = pair_id

    def _initiate(self):
        # Initialize the 16x16 board with empty squares
        for row in range(ROWS):
            for col in range(COLS):
                self.squares[row][col] = Square(row, col)

        # Place pieces for both colors (in the middle of top and bottom rows)
        for col in range(4, 12):  # Middle 8 squares
            # Black pawns
            self.squares[1][col] = Square(1, col, Pawn('black'))
            # White pawns
            self.squares[14][col] = Square(14, col, Pawn('white'))

        # Place the main pieces in the middle
        piece_order = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook]
        for idx, piece in enumerate(piece_order):
            # Black pieces
            self.squares[0][idx + 4] = Square(0, idx + 4, piece('black'))
            # White pieces
            self.squares[15][idx + 4] = Square(15, idx + 4, piece('white'))

    def move(self, piece, move, promotion="queen"):
        initial = move.initial
        final = move.final

        # Check for black hole interaction
        final_pos = (final.row, final.col)
        if final_pos in self.black_hole_positions and not self.is_blob_piece(piece):
            # Piece is consumed by black hole (except for Blobs)
            self.squares[initial.row][initial.col].piece = None
            return

        # Check for pieces adjacent to black holes
        for bh_row, bh_col in self.black_hole_positions:
            if abs(final.row - bh_row) <= 1 and abs(final.col - bh_col) <= 1:
                if not self.is_blob_piece(piece):
                    # Piece is consumed by black hole's gravity (except for Blobs)
                    self.squares[initial.row][initial.col].piece = None
                    return

        # Check for Crustacean asteroid movement
        if final_pos in self.asteroid_positions and self.is_crustacean_piece(piece):
            # Move the asteroid forward
            new_asteroid_pos = self.move_asteroid(final.row, final.col, piece.color)
            # Place the piece at the original asteroid position
            self.squares[initial.row][initial.col].piece = None
            self.squares[final.row][final.col].piece = piece
            piece.moved = True
            piece.clear_moves()
            self.last_move = move
            return

        # Check for wormhole interaction and update destination
        wormhole_destination = None
        for pos1, pos2 in self.wormhole_pairs:
            if final_pos == pos1:
                wormhole_destination = pos2
                break
            elif final_pos == pos2:
                wormhole_destination = pos1
                break

        # Normal move logic
        self.squares[initial.row][initial.col].piece = None
        
        if wormhole_destination:
            # Teleport through wormhole
            dest_row, dest_col = wormhole_destination
            self.squares[dest_row][dest_col].piece = piece
            # Update the move's final position for proper move tracking
            final.row, final.col = dest_row, dest_col
        else:
            # Regular piece placement
            self.squares[final.row][final.col].piece = piece
            # Check for planet colonization
            if self.squares[final.row][final.col].has_planet:
                self.colonize_planet(final.row, final.col, piece)

        if isinstance(piece, Pawn):
            # en passant capture
            diff = final.col - initial.col
            if diff != 0 and self.squares[final.row][final.col].isempty():
                self.squares[initial.row][initial.col + diff].piece = None
                if wormhole_destination:
                    dest_row, dest_col = wormhole_destination
                    self.squares[dest_row][dest_col].piece = piece
                else:
                    self.squares[final.row][final.col].piece = piece
                sound = Sound(os.path.join('assets/sounds/capture.wav'))
                sound.play()
            else:
                self.check_promotion(piece, final, promotion)

        if isinstance(piece, King):
            # Update castling logic for 16x16 board
            rowK = 0 if piece.color == "black" else 15
            if initial.col == 7 and final.col == 5:  # Queenside castle
                self.squares[rowK][4].piece = None
                self.squares[rowK][6].piece = Rook(color=piece.color)
            if initial.col == 7 and final.col == 9:  # Kingside castle
                self.squares[rowK][11].piece = None
                self.squares[rowK][8].piece = Rook(color=piece.color)

        piece.moved = True
        piece.clear_moves()
        self.last_move = move
        self.set_true_en_passant(piece)

    def check_promotion(self, piece, final, promotion):
        if final.row == 0 or final.row == 15:  # Updated for 16x16 board
            if promotion == 'queen':
                self.squares[final.row][final.col].piece = Queen(piece.color)
            elif promotion == 'rook':
                self.squares[final.row][final.col].piece = Rook(piece.color)
            elif promotion == 'bishop':
                self.squares[final.row][final.col].piece = Bishop(piece.color)
            else:
                self.squares[final.row][final.col].piece = Knight(piece.color)

    def valid_move(self, piece, move):
        return move in piece.moves

    def find_piece_positions(self, color):
        piece_positions = []
        for row in range(ROWS):
            for col in range(COLS):
                if self.squares[row][col].isempty():
                    piece_positions.append(0)
                else:
                    piece_positions.append(self.squares[row][col].piece.value)
        return piece_positions
    
    def set_true_en_passant(self, piece):
        
        if not isinstance(piece, Pawn):
            return

        for row in range(ROWS):
            for col in range(COLS):
                if isinstance(self.squares[row][col].piece, Pawn):
                    self.squares[row][col].piece.en_passant = False
        
        piece.en_passant = True

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
    
    def check_condition(self, giving_check, color, repeats):
        temp_board = copy.deepcopy(self)
        if repeats == 3:
            return 'Draw'
        pieces = 0
        for row in range(ROWS):
                for col in range(COLS):
                    if temp_board.squares[row][col].has_team_piece(color):
                        pieces += 1
                    elif temp_board.squares[row][col].has_enemy_piece(color):
                        pieces += 1
        if pieces <= 3:
            if pieces == 2:
                return 'Draw'
            for row in range(ROWS):
                for col in range(COLS):
                    if not temp_board.squares[row][col].isempty():
                        if temp_board.squares[row][col].piece.value in (3, 3.5):
                            return 'Draw'
        for row in range(ROWS):
            for col in range(COLS):
                if temp_board.squares[row][col].has_enemy_piece(color):
                    p = temp_board.squares[row][col].piece
                    temp_board.calc_moves(p, row, col, bool=True)
                    for m in p.moves:
                        if self.valid_move(p, m):
                            return "Ongoing"
        if giving_check:
            return f'Checkmate. {color.title()} won.'
        return 'Draw'


    def calc_moves(self, piece, row, col, bool=True, mode=False):
        def pawn_moves():
            # steps
            steps = 1 if piece.moved else 2

            # vertical moves
            start = row + piece.dir
            end = row + (piece.dir * (1 + steps))
            for possible_move_row in range(start, end, piece.dir):
                if Square.in_range(possible_move_row):
                    # Check for obstacles (asteroids)
                    if (possible_move_row, col) in self.asteroid_positions:
                        break
                    if self.squares[possible_move_row][col].isempty():
                        initial = Square(row, col)
                        final = Square(possible_move_row, col)
                        move = Move(initial, final)
                        
                        if bool:
                            if not self.in_check(piece, move):
                                piece.add_move(move)
                        else:
                            piece.add_move(move)
                    else: break
                else: break

            # diagonal moves
            possible_move_row = row + piece.dir
            possible_move_cols = [col-1, col+1]
            for possible_move_col in possible_move_cols:
                if Square.in_range(possible_move_row, possible_move_col):
                    # Allow moves to wormholes
                    pos = (possible_move_row, possible_move_col)
                    if any(pos in pair for pair in self.wormhole_pairs):
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col)
                        move = Move(initial, final)
                        piece.add_move(move)
                        continue

                    if self.squares[possible_move_row][possible_move_col].has_enemy_piece(piece.color):
                        initial = Square(row, col)
                        final_piece = self.squares[possible_move_row][possible_move_col].piece
                        final = Square(possible_move_row, possible_move_col, final_piece)
                        move = Move(initial, final)
                        
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
                        pos = (possible_move_row, possible_move_col)
                        
                        # Check for obstacles
                        if pos in self.asteroid_positions:
                            # Allow Crustaceans to move onto asteroids
                            if self.is_crustacean_piece(piece):
                                initial = Square(row, col)
                                final = Square(possible_move_row, possible_move_col)
                                move = Move(initial, final)
                                if bool:
                                    if not self.in_check(piece, move):
                                        piece.add_move(move)
                                else:
                                    piece.add_move(move)
                            break

                        # Allow moves to wormholes
                        if any(pos in pair for pair in self.wormhole_pairs):
                            initial = Square(row, col)
                            final = Square(possible_move_row, possible_move_col)
                            move = Move(initial, final)
                            piece.add_move(move)
                            break

                        # Allow Blobs to move onto black holes
                        if pos in self.black_hole_positions:
                            if self.is_blob_piece(piece):
                                initial = Square(row, col)
                                final = Square(possible_move_row, possible_move_col)
                                move = Move(initial, final)
                                if bool:
                                    if not self.in_check(piece, move):
                                        piece.add_move(move)
                                else:
                                    piece.add_move(move)
                            break

                        # Planet gravity well - pieces must stop on planets
                        if pos in self.planet_positions:
                            if self.squares[possible_move_row][possible_move_col].isempty():
                                initial = Square(row, col)
                                final = Square(possible_move_row, possible_move_col)
                                move = Move(initial, final)
                                if bool:
                                    if not self.in_check(piece, move):
                                        piece.add_move(move)
                                else:
                                    piece.add_move(move)
                            break

                        # Normal move/capture logic
                        if self.squares[possible_move_row][possible_move_col].isempty():
                            initial = Square(row, col)
                            final = Square(possible_move_row, possible_move_col)
                            move = Move(initial, final)
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)

                        # has enemy piece = add move + break
                        elif self.squares[possible_move_row][possible_move_col].has_enemy_piece(piece.color):
                            initial = Square(row, col)
                            final_piece = self.squares[possible_move_row][possible_move_col].piece
                            final = Square(possible_move_row, possible_move_col, final_piece)
                            move = Move(initial, final)
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)
                            break

                        # has team piece = break
                        elif self.squares[possible_move_row][possible_move_col].has_team_piece(piece.color):
                            break

                    else: break

                    possible_move_row = possible_move_row + row_incr
                    possible_move_col = possible_move_col + col_incr

        def knight_moves():
            moves = [
                (row-2, col+1), (row-1, col+2), (row+1, col+2), (row+2, col+1),
                (row+2, col-1), (row+1, col-2), (row-1, col-2), (row-2, col-1)
            ]
            
            for possible_move in moves:
                possible_move_row, possible_move_col = possible_move
                if Square.in_range(possible_move_row, possible_move_col):
                    pos = (possible_move_row, possible_move_col)
                    
                    # Skip if asteroid
                    if pos in self.asteroid_positions:
                        # Allow Crustaceans to move onto asteroids
                        if self.is_crustacean_piece(piece):
                            initial = Square(row, col)
                            final = Square(possible_move_row, possible_move_col)
                            move = Move(initial, final)
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)
                        continue

                    # Allow moves to wormholes
                    if any(pos in pair for pair in self.wormhole_pairs):
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col)
                        move = Move(initial, final)
                        piece.add_move(move)
                        continue

                    # Allow Blobs to move onto black holes
                    if pos in self.black_hole_positions and self.is_blob_piece(piece):
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col)
                        move = Move(initial, final)
                        if bool:
                            if not self.in_check(piece, move):
                                piece.add_move(move)
                        else:
                            piece.add_move(move)
                        continue

                    if self.squares[possible_move_row][possible_move_col].isempty_or_enemy(piece.color):
                        initial = Square(row, col)
                        final_piece = self.squares[possible_move_row][possible_move_col].piece
                        final = Square(possible_move_row, possible_move_col, final_piece)
                        move = Move(initial, final)
                        
                        if bool:
                            if not self.in_check(piece, move):
                                piece.add_move(move)
                        else:
                            piece.add_move(move)

        def king_moves():
            moves = [
                (row-1, col+0), (row-1, col+1), (row+0, col+1), (row+1, col+1),
                (row+1, col+0), (row+1, col-1), (row+0, col-1), (row-1, col-1)
            ]
            
            for possible_move in moves:
                possible_move_row, possible_move_col = possible_move
                if Square.in_range(possible_move_row, possible_move_col):
                    pos = (possible_move_row, possible_move_col)
                    
                    # Skip if asteroid
                    if pos in self.asteroid_positions:
                        continue
                        
                    # Allow moves to wormholes
                    if any(pos in pair for pair in self.wormhole_pairs):
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col)
                        move = Move(initial, final)
                        if self.borders_enemy_king(move, piece.color):
                            piece.add_move(move)
                        continue

                    if self.squares[possible_move_row][possible_move_col].isempty_or_enemy(piece.color):
                        initial = Square(row, col)
                        final = Square(possible_move_row, possible_move_col)
                        move = Move(initial, final)
                        if self.borders_enemy_king(move, piece.color):
                            if bool:
                                if not self.in_check(piece, move):
                                    piece.add_move(move)
                            else:
                                piece.add_move(move)

            # castling moves
            if not piece.moved:
                rowK = 0 if piece.color == "black" else 15
                # king castling
                if self.squares[rowK][6].isempty() and self.squares[rowK][5].isempty() and isinstance(self.squares[rowK][7].piece, Rook):
                    initialK = Square(rowK, 4)
                    finalK = Square(rowK, 6)
                    moveK = Move(initialK, finalK)
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
                    if bool:
                        if not self.in_check(piece, moveK):
                            piece.add_move(moveK)
                    else:
                        piece.add_move(moveK)

        # Calculate moves based on piece type
        if isinstance(piece, Pawn):
            pawn_moves()
        elif isinstance(piece, Knight):
            knight_moves()
        elif isinstance(piece, Bishop):
            straightline_moves([
                (-1, 1), # up-right
                (-1, -1), # up-left
                (1, 1), # down-right
                (1, -1), # down-left
            ])
        elif isinstance(piece, Rook):
            straightline_moves([
                (-1, 0), # up
                (0, 1), # right
                (1, 0), # down
                (0, -1), # left
            ])
        elif isinstance(piece, Queen):
            straightline_moves([
                (-1, 1), # up-right
                (-1, -1), # up-left
                (1, 1), # down-right
                (1, -1), # down-left
                (-1, 0), # up
                (0, 1), # right
                (1, 0), # down
                (0, -1) # left
            ])
        elif isinstance(piece, King):
            king_moves()

    def get_empty_adjacent_squares(self, row, col):
        adjacent_squares = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                new_row, new_col = row + dr, col + dc
                if Square.in_range(new_row, new_col):
                    square = self.squares[new_row][new_col]
                    if square.isempty() and not square.has_asteroid and not square.has_planet and not square.has_black_hole and not square.is_wormhole:
                        adjacent_squares.append((new_row, new_col))
        return adjacent_squares

    def colonize_planet(self, row, col, piece):
        # Update planet ownership
        square = self.squares[row][col]
        square.planet_owner = piece.color
        
        # Get empty adjacent squares for pawn spawning
        empty_squares = self.get_empty_adjacent_squares(row, col)
        
        # Determine number of pawns to spawn based on civilization
        num_pawns = 1  # Default for all civilizations
        if hasattr(self, 'player_civ') and hasattr(self, 'ai_civ'):
            # Check if the colonizing piece belongs to a Reptiloid player
            is_reptiloid = (piece.color == 'white' and self.player_civ == CIVILIZATION_REPTILOID) or \
                          (piece.color == 'black' and self.ai_civ == CIVILIZATION_REPTILOID)
            
            if is_reptiloid:
                # Reptiloids can spawn up to 2 extra pawns (3 total) if space permits
                num_pawns = min(3, len(empty_squares))
        else:
            num_pawns = min(1, len(empty_squares))
        
        # Spawn pawns in empty adjacent squares
        for i in range(num_pawns):
            if i < len(empty_squares):
                spawn_row, spawn_col = empty_squares[i]
                self.squares[spawn_row][spawn_col].piece = Pawn(piece.color)
                
    def set_civilizations(self, player_civ, ai_civ):
        self.player_civ = player_civ
        self.ai_civ = ai_civ

    def is_blob_piece(self, piece):
        if not hasattr(self, 'player_civ') or not hasattr(self, 'ai_civ'):
            return False
        return (piece.color == 'white' and self.player_civ == CIVILIZATION_BLOB) or \
               (piece.color == 'black' and self.ai_civ == CIVILIZATION_BLOB)

    def is_crustacean_piece(self, piece):
        if not hasattr(self, 'player_civ') or not hasattr(self, 'ai_civ'):
            return False
        return (piece.color == 'white' and self.player_civ == CIVILIZATION_CRUSTACEAN) or \
               (piece.color == 'black' and self.ai_civ == CIVILIZATION_CRUSTACEAN)

    def move_asteroid(self, initial_row, initial_col, piece_color):
        # Determine direction based on piece color
        direction = -1 if piece_color == 'white' else 1
        
        # Calculate target position (up to 4 squares forward)
        for steps in range(1, 5):
            target_row = initial_row + (direction * steps)
            
            # If asteroid would move off board, remove it
            if not Square.in_range(target_row, initial_col):
                self.squares[initial_row][initial_col].has_asteroid = False
                self.asteroid_positions.remove((initial_row, initial_col))
                return None
            
            # Check if there's a piece in the way
            target_square = self.squares[target_row][initial_col]
            if target_square.has_piece():
                # If enemy piece, both asteroid and piece disappear
                if target_square.piece.color != piece_color:
                    target_square.piece = None
                self.squares[initial_row][initial_col].has_asteroid = False
                self.asteroid_positions.remove((initial_row, initial_col))
                return None
            
            # Check for other obstacles
            target_pos = (target_row, initial_col)
            if target_pos in self.asteroid_positions or \
               target_pos in self.planet_positions or \
               target_pos in self.black_hole_positions or \
               any(target_pos in pair for pair in self.wormhole_pairs):
                # If obstacle found, place asteroid at previous position
                if steps > 1:
                    new_row = target_row - direction
                    # Update asteroid position
                    self.squares[initial_row][initial_col].has_asteroid = False
                    self.squares[new_row][initial_col].has_asteroid = True
                    self.asteroid_positions.remove((initial_row, initial_col))
                    self.asteroid_positions.append((new_row, initial_col))
                    return (new_row, initial_col)
                return (initial_row, initial_col)
        
        # If no obstacles found, move asteroid to final position
        final_row = initial_row + (direction * 4)
        if Square.in_range(final_row, initial_col):
            self.squares[initial_row][initial_col].has_asteroid = False
            self.squares[final_row][initial_col].has_asteroid = True
            self.asteroid_positions.remove((initial_row, initial_col))
            self.asteroid_positions.append((final_row, initial_col))
            return (final_row, initial_col)
        else:
            # Remove asteroid if it would move off board
            self.squares[initial_row][initial_col].has_asteroid = False
            self.asteroid_positions.remove((initial_row, initial_col))
            return None