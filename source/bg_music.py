import pygame

class Bg_music:

    def insert_into_playlist(playlist, music_file):
    
    # Adding songs file in our playlist
        playlist.append(music_file)

    def start_playlist(playList):
    
        # Loading first audio file into our player
        pygame.mixer.music.load(playList[0])
        
        # Removing the loaded song from our playlist list
        playList.pop(0)
    
        # Playing our music
        pygame.mixer.music.play()
    
        # Queueing next song into our player
        pygame.mixer.music.queue(playList[0])
        playList.pop(0)
    
    