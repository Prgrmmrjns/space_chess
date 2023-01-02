import pygame, sys, pygame_menu, os, random
from pygame_menu import themes
from const import *
from game import Game
from square import Square
from move import Move
from ai import AI
from config import Config
from bg_music import Bg_music

class Main:

    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode( (WIDTH, HEIGHT) )
        pygame.display.set_caption('Start')
        self.game = Game()
        self.config = Config()
        self.mode = 'plvsai'
        self.color = 'white'
        self.username = ""
        self.music = 'mixed'

    # Main menu to select options
    def mainmenu(self):
        game = self.game

        # Start main loop
        def start_the_game():
            self.mainloop()

        def store_username(value):
            self.username = value

        def choose_mode():
            mainmenu._open(mode)

        def set_mode(value, mode):
            self.mode = mode

        def choose_color():
            mainmenu._open(color)

        def set_color(value, color):
            self.color = color
        
        def choose_music():
            mainmenu._open(music)

        def set_music(value, color):
            self.music = color

        def choose_about():
            mainmenu._open(about)


        pygame.init()
        mainmenu = pygame_menu.Menu('Welcome', 800, 800, theme=themes.THEME_SOLARIZED)
        mainmenu.add.text_input('Name: ', default='', onchange= store_username)
        mainmenu.add.button('Play', start_the_game)
        mainmenu.add.button('Mode', choose_mode)
        mainmenu.add.button('Color', choose_color)
        mainmenu.add.button('Music', choose_music)
        mainmenu.add.button('About', choose_music)
        mainmenu.add.button('Restart', game.reset)
        mainmenu.add.button('Quit', pygame_menu.events.EXIT)
        #https://pixabay.com/music/
        mode = pygame_menu.Menu('Select a Mode', 800, 800, theme=themes.THEME_BLUE)
        mode.add.selector('Mode :', [('Player vs AI', 'plvsai'), ('1 vs 1', 'plvspl'), ('AI vs AI', 'aivsai')], onchange=set_mode)

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
        ongoing = True
        turn = "white"
        username = self.username
        
        # Background music
        if self.music != 'None':
            playList = []
            all_music = os.listdir('assets/sounds/bg_music/')
            for track in all_music:
                Bg_music.insert_into_playlist(playList, f'assets/sounds/bg_music/{track}')
            Bg_music.start_playlist(playList)
                
        if mode =='plvsai' or mode =='aivsai':
            player_color = self.color
            ai_color = 'white' if player_color == 'black' else 'black'
            ai = AI(ai_color)
        if mode == 'aivsai':
            second_ai_color = 'white' if ai_color == 'black' else 'black'
            second_ai = AI(second_ai_color)

        while True:
            
            # show methods
            game.show_screen(screen, giving_check, turn)  
            if mode =='plvsai' or mode =='aivsai':
                if ongoing:
                    if turn == ai_color:
                        ai_moves = board.find_moves(ai_color)
                        move, piece = ai.choose_move(board, ai_moves)
                        if move is not None:
                            ai.make_move(board, move, piece)
                            giving_check = board.giving_check(piece, move)
                            self.game.move_number += 1
                            turn = 'white' if turn == 'black' else 'black'

            if mode =='aivsai':
                if ongoing:
                    if turn == second_ai_color:
                        ai_moves = board.find_moves(second_ai_color)
                        move, piece = second_ai.choose_move(board, ai_moves)
                        if move is not None:
                            second_ai.make_move(board, move, piece)
                            giving_check = board.giving_check(piece, move)
                            self.game.move_number += 1
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
                            board.move(dragger.piece, move)   
                            board.set_true_en_passant(dragger.piece)       
                            # sounds
                            game.play_sound(captured)
                            self.game.move_number += 1
                            # animation when player is checkmated
                            giving_check = board.giving_check(piece, move)
                            condition = board.check_condition(giving_check, piece.color, mode, username)
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

                    # changing mode
                    if event.key == pygame.K_a:
                        game.reset()
                        ongoing = True
                        turn = 'white'
                        game = self.game
                        board = self.game.board
                        dragger = self.game.dragger
                        mode = mode
                        mode_str = 'AI' if mode else '1v1'
                        pygame.display.set_caption(f'Changing mode to {mode_str}')

                     # changing themes
                    elif event.key == pygame.K_r:
                        giving_check = False
                        self.game.move_number = 0
                        pygame.display.set_caption("Restart")
                        game.reset()
                        ongoing = True
                        turn = 'white'
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