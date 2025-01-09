import pygame

class Sound:

    def __init__(self, path):
        self.sound = pygame.mixer.Sound(path)

    def play(self):
        pygame.mixer.Sound.play(self.sound)

    @staticmethod
    def insert_into_playlist(playlist, path):
        playlist.append(path)

    @staticmethod
    def start_playlist(playlist):
        if not playlist:
            return
            
        pygame.mixer.music.load(playlist[0])
        pygame.mixer.music.play()
        
        # Queue remaining songs one by one
        for track in playlist[1:]:
            pygame.mixer.music.queue(track)