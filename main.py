import pygame, sys, pygame_menu, os, sys, random
from pygame_menu import themes
from const import *
from game import Game
from square import Square
from move import Move
from ai import AI
from config import Config
from sound import Sound

class Main:

    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption('Space Chess')
        self.game = Game()
        self.config = Config()
        self.mode = 'plvsai'
        self.civilization = CIVILIZATION_REPTILOID
        self.color = 'white'
        self.music = 'mixed'
        # Space elements positions
        self.asteroid_positions = []
        self.planet_positions = []
        self.black_hole_positions = []
        self.wormhole_pairs = []
        self._initialize_space_elements()
        # Load civilization images
        self.civ_images = {}
        try:
            image_paths = {
                CIVILIZATION_REPTILOID: os.path.join('assets', 'images', 'civs', 'reptiloid.webp'),
                CIVILIZATION_CRUSTACEAN: os.path.join('assets', 'images', 'civs', 'crustacean.webp'),
                CIVILIZATION_BLOB: os.path.join('assets', 'images', 'civs', 'blob.webp')
            }
            
            for civ, path in image_paths.items():
                try:
                    full_path = os.path.abspath(path)
                    if os.path.exists(full_path):
                        image = pygame.image.load(full_path).convert_alpha()
                        self.civ_images[civ] = pygame.transform.scale(image, (200, 200))
                    else:
                        print(f"Image file not found: {full_path}")
                except Exception as e:
                    print(f"Error loading civilization image for {civ}: {e}")
        except Exception as e:
            print(f"Error initializing civilization images: {e}")

    def _initialize_space_elements(self):
        # Create a list of all possible positions (excluding the top and bottom 3 rows for piece placement)
        available_positions = [(r, c) for r in range(3, ROWS-3) for c in range(COLS)]
        random.shuffle(available_positions)
        
        # Assign positions for space elements
        self.asteroid_positions = available_positions[:ASTEROID_COUNT]
        self.planet_positions = available_positions[ASTEROID_COUNT:ASTEROID_COUNT + PLANET_COUNT]
        
        # Assign positions for black holes
        black_holes_start = ASTEROID_COUNT + PLANET_COUNT
        self.black_hole_positions = available_positions[black_holes_start:black_holes_start + BLACK_HOLE_COUNT]
        
        # Assign positions for wormhole pairs
        wormhole_start = black_holes_start + BLACK_HOLE_COUNT
        self.wormhole_pairs = []
        for i in range(WORMHOLE_PAIRS):
            pos1 = available_positions[wormhole_start + i * 2]
            pos2 = available_positions[wormhole_start + i * 2 + 1]
            self.wormhole_pairs.append((pos1, pos2))

    def show_civilization_image(self, civilization):
        # Clear the screen
        self.screen.fill((0, 0, 0))
        
        # Get the image
        image = self.civ_images[civilization]
        
        # Calculate position to center the image
        x = (WIDTH - image.get_width()) // 2
        y = (HEIGHT - image.get_height()) // 2
        
        # Draw the image
        self.screen.blit(image, (x, y))
        pygame.display.update()
        
    def mainmenu(self):
        game = self.game

        def start_the_game():
            self.mainloop()

        def show_info_menu():
            # Clear current menu
            mainmenu.clear()
            
            # Title
            mainmenu.add.label("Space Chess Rules", font_size=50, margin=(0, 20))
            
            # Space elements information
            info_frame = mainmenu.add.frame_v(width=WIDTH - 200, height=HEIGHT - 200, margin=(0, 20))
            info_frame._pack_margin_warning = False
            
            # Add information about each space element
            info_frame.pack(mainmenu.add.label("Space Elements", font_size=35, margin=(0, 20)))
            
            info_frame.pack(mainmenu.add.label("Asteroids:", font_size=28, margin=(0, 10), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Block movement of pieces", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Crustaceans can move them forward potentially capturing an enemy piece", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            
            info_frame.pack(mainmenu.add.label("Planets:", font_size=28, margin=(0, 10), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Can be captured. Upon capture, up to two pawns can be spawned next to it", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Reptiloids will spawn up to four pawns when capturing a planet", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            
            info_frame.pack(mainmenu.add.label("Black Holes:", font_size=28, margin=(0, 10), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Destroy any piece that lands on or adjacent to them", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Blob civilization pieces are immune", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            
            info_frame.pack(mainmenu.add.label("Wormholes:", font_size=28, margin=(0, 10), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Come in connected pairs", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            info_frame.pack(mainmenu.add.label("• Pieces can teleport between them", font_size=24, margin=(0, 5), align=pygame_menu.locals.ALIGN_LEFT))
            
            # Back button
            info_frame.pack(mainmenu.add.button("Back to Main Menu", setup_main_menu, font_size=30, margin=(0, 30)))

        def set_mode(mode):
            self.mode = mode
            # Refresh with updated selection
            mainmenu.clear()
            setup_main_menu()

        def set_civilization(civ):
            self.civilization = civ
            # Refresh with updated selection
            mainmenu.clear()
            setup_main_menu()

        def set_color(color):
            self.color = color
            # Refresh with updated selection
            mainmenu.clear()
            setup_main_menu()

        def set_music(value, music):
            self.music = music
            # Refresh with updated selection
            mainmenu.clear()
            setup_main_menu()

        def setup_main_menu():
            mainmenu.clear()
            mainmenu.add.label("Space Chess", font_size=50, margin=(0, 20))
            
            # Information button at the top
            mainmenu.add.button(
                "Game Information",
                show_info_menu,
                font_size=30,
                margin=(0, 20),
                background_color=(50, 50, 50),
                selection_color=(0,0,0,0)
            )
            
            # Game modes section
            mainmenu.add.label("Game Mode", font_size=30, margin=(0, 10))
            modes_frame = mainmenu.add.frame_h(width=800, height=80, margin=(0, 10))
            modes_frame.pack(
                mainmenu.add.button(
                    "Player vs AI", 
                    lambda: set_mode('plvsai'),
                    background_color=(100, 100, 255) if self.mode == 'plvsai' else None,
                    selection_color=(0,0,0,0)  # Transparent color instead of None
                )
            )
            modes_frame.pack(
                mainmenu.add.button(
                    "AI vs AI", 
                    lambda: set_mode('aivsai'),
                    background_color=(100, 100, 255) if self.mode == 'aivsai' else None,
                    selection_color=(0,0,0,0)
                )
            )
            modes_frame.pack(
                mainmenu.add.button(
                    "Player vs Player",
                    lambda: set_mode('plvspl'),
                    background_color=(100, 100, 255) if self.mode == 'plvspl' else None,
                    selection_color=(0,0,0,0)
                )
            )

            # Color selection section
            mainmenu.add.label("Choose Your Color", font_size=30, margin=(0, 10))
            color_frame = mainmenu.add.frame_h(width=400, height=80, margin=(0, 10))
            color_frame.pack(
                mainmenu.add.button(
                    "White", 
                    lambda: set_color('white'),
                    background_color=(100, 100, 255) if self.color == 'white' else None,
                    selection_color=(0,0,0,0)
                )
            )
            color_frame.pack(
                mainmenu.add.button(
                    "Black", 
                    lambda: set_color('black'),
                    background_color=(100, 100, 255) if self.color == 'black' else None,
                    selection_color=(0,0,0,0)
                )
            )

            # Civilization selection section
            mainmenu.add.label("Choose Your Civilization", font_size=30, margin=(0, 10))
            
            # Create civilization container
            civ_container = mainmenu.add.frame_h(width=WIDTH - 100, height=150, margin=(0, 10))
            civ_container._pack_margin_warning = False

            names = {
                CIVILIZATION_REPTILOID: "Reptiloids",
                CIVILIZATION_CRUSTACEAN: "Crustaceans",
                CIVILIZATION_BLOB: "Blobs"
            }
            mechanics = {
                CIVILIZATION_REPTILOID: "Spawn extra pawns",
                CIVILIZATION_CRUSTACEAN: "Move asteroids",
                CIVILIZATION_BLOB: "Immune to black holes"
            }

            # Calculate button width and spacing
            button_width = 300
            total_width = button_width * 3
            spacing = (WIDTH - total_width) // 4

            for i, civ in enumerate([CIVILIZATION_REPTILOID, CIVILIZATION_CRUSTACEAN, CIVILIZATION_BLOB]):
                button_text = f"{names[civ]}\n{mechanics[civ]}"
                civ_container.pack(
                    mainmenu.add.button(
                        button_text,
                        lambda c=civ: set_civilization(c),
                        background_color=(100, 100, 255) if self.civilization == civ else (50, 50, 50),
                        selection_color=(0,0,0,0),
                        margin=(spacing if i == 0 else spacing//2, 0),
                        font_size=24,
                        button_id=f"civ_{civ}"
                    )
                )

            # Add play and quit buttons at the bottom
            button_frame = mainmenu.add.frame_h(width=400, height=80, margin=(0, 20))
            button_frame.pack(mainmenu.add.button('Play', start_the_game))
            button_frame.pack(mainmenu.add.button('Quit', pygame_menu.events.EXIT))

        pygame.init()
        mainmenu = pygame_menu.Menu('Space Chess', WIDTH, HEIGHT, theme=themes.THEME_DARK)
        setup_main_menu()

        # Custom arrow for selection (can be hidden if not desired)
        arrow = pygame_menu.widgets.LeftArrowSelection(arrow_size=(10, 15))

        while True:
            events = pygame.event.get()
            for event in events:
                if event.type == pygame.QUIT:
                    exit()
                if mainmenu.is_enabled():
                    mainmenu.update(events)
                    mainmenu.draw(self.screen)
                    if mainmenu.get_current().get_selected_widget():
                        arrow.draw(self.screen, mainmenu.get_current().get_selected_widget())
            pygame.display.update()

    def mainloop(self):
        screen = self.screen
        game = self.game
        board = self.game.board
        dragger = self.game.dragger   

        # Initialize space elements
        board.set_space_elements(
            self.asteroid_positions, 
            self.planet_positions, 
            self.black_hole_positions,
            self.wormhole_pairs
        )

        # Set up civilizations
        available_civs = [CIVILIZATION_REPTILOID, CIVILIZATION_CRUSTACEAN, CIVILIZATION_BLOB]
        available_civs.remove(self.civilization)  # Remove player's choice
        ai_civilization = random.choice(available_civs)  # Randomly select from remaining
        game.set_civilizations(self.civilization, ai_civilization, self.civ_images)
        board.set_civilizations(self.civilization, ai_civilization)  # Pass civilizations to board

        # Game state
        giving_check = False
        mode = self.mode
        ongoing = True
        turn = "white"
        last_boards = []
        repeats = 0
        
        # Background music
        if self.music != 'None':
            playList = []
            music_path = os.path.join(self.game.config.assets_path, 'sounds', 'bg_music')
            all_music = os.listdir(music_path)
            for track in all_music:
                track_path = os.path.join(music_path, track)
                Sound.insert_into_playlist(playList, track_path)
            Sound.start_playlist(playList)
                
        if mode == 'plvsai':
            player_color = self.color
            ai_color = 'white' if player_color == 'black' else 'black'
            strategy = "hard_code"
            ai = AI(ai_color, strategy)
        
        if mode == 'aivsai':
            ai_color = 'white'
            strategy = "hard_code"
            ai = AI(ai_color, strategy)
            second_ai_color = 'black'
            strategy = "hard_code"
            second_ai = AI(second_ai_color, strategy)

        while True:
            # Show methods
            game.show_screen(screen, giving_check, turn)
            
            if dragger.dragging:
                dragger.update_blit(screen)

            for event in pygame.event.get():
                # Click
                if event.type == pygame.MOUSEBUTTONDOWN:
                    dragger.update_mouse(event.pos)
                    mouseX, mouseY = event.pos

                    # Check for sidebar button clicks
                    if mouseX > BOARD_WIDTH:  # In sidebar area
                        button_y = HEIGHT - 100
                        button_height = 40
                        if button_y <= mouseY <= button_y + button_height:  # Back button
                            self.mainmenu()
                        elif button_y + button_height + 10 <= mouseY <= button_y + 2 * button_height + 10:  # Restart button
                            self.game.reset()
                            self.mainloop()
                            return

                    # Game click handling (only if game is ongoing)
                    if ongoing and mouseX < BOARD_WIDTH:
                        clicked_row = dragger.mouseY // SQSIZE
                        clicked_col = dragger.mouseX // SQSIZE

                        # Check if clicked square has a piece
                        if Square.in_range(clicked_row, clicked_col):
                            square = board.squares[clicked_row][clicked_col]
                            piece = square.piece

                            # Check for valid piece selection
                            if square.has_piece() and piece.color == turn:
                                board.calc_moves(piece, clicked_row, clicked_col, bool=True)
                                dragger.save_initial(event.pos)
                                dragger.drag_piece(piece)
                
                # Mouse motion
                elif event.type == pygame.MOUSEMOTION and ongoing:
                    if dragger.dragging:
                        dragger.update_mouse(event.pos)
                
                # Click release
                elif event.type == pygame.MOUSEBUTTONUP and ongoing:
                    if dragger.dragging:
                        final_row = dragger.mouseY // SQSIZE
                        final_col = dragger.mouseX // SQSIZE

                        initial = Square(dragger.initial_row, dragger.initial_col)
                        final = Square(final_row, final_col)
                        move = Move(initial, final)

                        # Check if move is valid
                        if board.valid_move(dragger.piece, move):
                            captured = not board.squares[final_row][final_col].isempty()
                            board.move(dragger.piece, move)
                            
                            # Play sound
                            if captured:
                                Sound(os.path.join('assets/sounds/capture.wav')).play()
                            else:
                                Sound(os.path.join('assets/sounds/move.wav')).play()

                            # Check game state
                            giving_check = board.giving_check(dragger.piece, move)
                            piece_positions = board.find_piece_positions(turn)
                            last_boards.append(piece_positions)
                            if len(last_boards) > 9:
                                last_boards = last_boards[(len(last_boards)-9):len(last_boards)]
                                repeats = last_boards.count(piece_positions)
                            
                            condition = board.check_condition(giving_check, turn, repeats)
                            if condition != "Ongoing": 
                                ongoing = False
                                print(condition)
                            
                            pygame.display.set_caption(condition)
                            turn = 'white' if turn == 'black' else 'black'
                            
                    dragger.undrag_piece()
                
                # Key press
                elif event.type == pygame.KEYDOWN:
                    # Return to menu
                    if event.key == pygame.K_m:
                        self.mainmenu()
                    # Restart game
                    elif event.key == pygame.K_r:
                        self.game.reset()
                        self.mainloop()
                        return
                    # Exit game
                    elif event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
                
                # Quit application
                elif event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

            # AI moves
            if mode == 'plvsai' and ongoing and turn == ai_color:
                giving_check = ai.make_move(board, repeats)
                piece_positions = board.find_piece_positions(turn)
                last_boards.append(piece_positions)
                if len(last_boards) > 9:
                    last_boards = last_boards[(len(last_boards)-9):len(last_boards)]
                    repeats = last_boards.count(piece_positions)
                condition = board.check_condition(giving_check, turn, repeats)
                if condition != "Ongoing": 
                    ongoing = False
                    print(condition)
                turn = 'white' if turn == 'black' else 'black'

            if mode == 'aivsai' and ongoing:
                if turn == ai_color:
                    giving_check = ai.make_move(board, repeats)
                else:
                    giving_check = second_ai.make_move(board, repeats)
                
                piece_positions = board.find_piece_positions(turn)
                last_boards.append(piece_positions)
                if len(last_boards) > 9:
                    last_boards = last_boards[(len(last_boards)-9):len(last_boards)]
                    repeats = last_boards.count(piece_positions)
                condition = board.check_condition(giving_check, turn, repeats)
                if condition != "Ongoing": 
                    ongoing = False
                    print(condition)
                turn = 'white' if turn == 'black' else 'black'

            pygame.display.update()

main = Main()
main.mainmenu()
