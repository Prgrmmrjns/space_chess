import pygame, sys, pygame_menu, os, sys
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
        self.screen = pygame.display.set_mode( (WIDTH, HEIGHT) )
        pygame.display.set_caption('Start')
        self.game = Game()
        self.config = Config()
        self.mode = 'plvsai'
        self.promotion = 'queen'
        self.color = 'white'
        self.music = 'mixed'

    # Main menu to select options
    def mainmenu(self):
        game = self.game

        # Start main loop
        def start_the_game():
            self.mainloop()
            
        def choose_mode():
            mainmenu._open(mode)

        def set_mode(value, mode):
            self.mode = mode

        def choose_promotion():
            mainmenu._open(promotion)

        def set_promotion(value, promotion):
            self.promotion = promotion

        def choose_color():
            mainmenu._open(color)

        def set_color(value, color):
            self.color = color
        
        def choose_music():
            mainmenu._open(music)

        def set_music(value, color):
            self.music = music

        def choose_about():
            mainmenu._open(about)

        pygame.init()
        mainmenu = pygame_menu.Menu('Welcome', 800, 800, theme=themes.THEME_SOLARIZED)
        mainmenu.add.button('Play', start_the_game)
        mainmenu.add.button('Mode', choose_mode)
        mainmenu.add.button('Promotion settings', choose_promotion)
        mainmenu.add.button('Color', choose_color)
        mainmenu.add.button('Music', choose_music)
        mainmenu.add.button('About', choose_about)
        mainmenu.add.button('Restart', game.reset)
        mainmenu.add.button('Quit', pygame_menu.events.EXIT)
        #https://pixabay.com/music/
        mode = pygame_menu.Menu('Select a Mode', 800, 800, theme=themes.THEME_BLUE)
        mode.add.selector('Mode :', [('Player vs AI', 'plvsai'), ('AI vs AI', 'aivsai'), ('1 vs 1', 'plvspl')], onchange=set_mode)

        promotion = pygame_menu.Menu('Select your preferred promotion piece', 800, 800, theme=themes.THEME_BLUE)
        promotion.add.selector('Promotion piece :', [('Queen', 'queen'), ('Rook', 'rook'), ('Bishop', 'bishop'), ('Knight', 'knight')], onchange=set_promotion)
        
        color = pygame_menu.Menu('Select a Color', 800, 800, theme=themes.THEME_BLUE)
        color.add.selector('Color :', [('White', 'white'), ('Black', 'black')], onchange=set_color)

        music = pygame_menu.Menu('Select a Music', 800, 800, theme=themes.THEME_BLUE)
        music.add.selector('Music :', [('Mixed', 'mixed'), ('No music', 'None'),], onchange=set_music)

        about = pygame_menu.Menu('About', 800, 800, theme=themes.THEME_BLUE)
        about.add.url('https://jonaswolber.netlify.app/', 'Jonas Wolber Website')
        about.add.url('https://jonaswolber.netlify.app/', 'Jonas Wolber Github')

        arrow = pygame_menu.widgets.LeftArrowSelection(arrow_size = (10, 15))

        while True:
            events = pygame.event.get()
            for event in events:
                if event.type == pygame.QUIT:
                    exit()
                if mainmenu.is_enabled():
                    mainmenu.update(events)
                    mainmenu.draw(self.screen)
                    if (mainmenu.get_current().get_selected_widget()):
                        arrow.draw(self.screen, mainmenu.get_current().get_selected_widget())
            pygame.display.update()
        

    def mainloop(self):
        screen = self.screen
        game = self.game
        board = self.game.board
        dragger = self.game.dragger   
        giving_check = False
        mode = self.mode
        promotion = self.promotion
        ongoing = True
        turn = "white"
        last_boards = []
        repeats = 0
        
        # Background music
        if self.music != 'None':
            playList = []
            all_music = os.listdir('D:/Python_projekte/chess/assets/sounds/bg_music/')
            for track in all_music:
                Sound.insert_into_playlist(playList, f'D:/Python_projekte/chess/assets/sounds/bg_music/{track}')
            Sound.start_playlist(playList)
                
        if mode =='plvsai':
            player_color = self.color
            ai_color = 'white' if player_color == 'black' else 'black'
            strategy = "hard_code"
            ai = AI(ai_color, strategy)
        
        if mode =='aivsai':
            ai_color = 'white'
            strategy = "hard_code"
            ai = AI(ai_color, strategy)
            second_ai_color = 'black'
            strategy = "hard_code"
            second_ai = AI(second_ai_color, strategy)

        while True:
            
            # show methods
            game.show_screen(screen, giving_check, turn)  
            if mode =='plvsai' and ongoing and turn == ai_color:
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

            if mode =='aivsai' and ongoing: 
                if turn == ai_color:
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

            if dragger.dragging:
                dragger.update_blit(screen)

            for event in pygame.event.get():

                # click
                if event.type == pygame.MOUSEBUTTONDOWN and ongoing:
                    dragger.update_mouse(event.pos)

                    initial_row = dragger.mouseY // SQSIZE
                    initial_col = dragger.mouseX // SQSIZE
                    piece = board.squares[initial_row][initial_col].piece

                    # if clicked square has a piece ?
                    if not board.squares[initial_row][initial_col].isempty() and piece.color == turn:
                        board.calc_moves(piece, initial_row, initial_col, bool=True)
                        dragger.save_initial(event.pos)
                        dragger.drag_piece(piece)
                
                # mouse motion
                elif event.type == pygame.MOUSEMOTION and ongoing:

                    if dragger.dragging:
                        dragger.update_mouse(event.pos)
                        # show methods
                        dragger.update_blit(screen)
                
                # click release
                elif event.type == pygame.MOUSEBUTTONUP and ongoing:
                    
                    if dragger.dragging:
                        final_row = dragger.mouseY // SQSIZE
                        final_col = dragger.mouseX // SQSIZE

                        # create possible move
                        initial = Square(dragger.initial_row, dragger.initial_col)
                        final = Square(final_row, final_col)
                        move = Move(initial, final)

                        # valid move ?
                        if board.valid_move(dragger.piece, move):
                            # normal capture
                            captured = not board.squares[final_row][final_col].isempty()
                            board.move(dragger.piece, move, promotion)        
                            # sounds
                            game.play_sound(captured)
                            # animation when player is checkmated
                            giving_check = board.giving_check(piece, move)
                            piece_positions = board.find_piece_positions(turn)
                            last_boards.append(piece_positions)
                            if len(last_boards) > 9:
                                last_boards = last_boards[(len(last_boards)-9):len(last_boards)]
                                repeats = last_boards.count(piece_positions)
                            condition = board.check_condition(giving_check, turn, repeats)
                            if condition != "Ongoing": 
                                ongoing = False
                                print(condition)
                            # Set caption to game condition
                            pygame.display.set_caption(condition)
                            # next turn
                            turn = 'white' if turn == 'black' else 'black'
                            
                    dragger.undrag_piece()
                
                # key press
                elif event.type == pygame.KEYDOWN:
                    
                    # changing themes
                    if event.key == pygame.K_t:
                        game.change_theme()

                    # return to main menu
                    if event.key == pygame.K_m:
                        main.mainmenu()

                     # changing themes
                    elif event.key == pygame.K_r:
                        giving_check = False
                        pygame.display.set_caption("Restart")
                        ongoing, turn, last_boards, repeats = game.reset()
                        game = self.game
                        board = self.game.board
                        dragger = self.game.dragger

                # quit application
                elif event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
            
            pygame.display.update()

main = Main()
main.mainmenu()
