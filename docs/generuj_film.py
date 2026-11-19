"""Montuje film edukacyjny „Cztery pory roku” i tworzy do niego ścieżkę dźwiękową.

Uruchomienie z katalogu projektu (wymaga Pillow, NumPy i FFmpeg w PATH):
    python docs/generuj_film.py <folder z klipami>

Obraz: cztery 5-sekundowe klipy tej samej górskiej doliny wygenerowane w PixVerse V6
(tryb obraz + tekst, opisy w docs/PROMPTY_FILMU.md). W folderze muszą leżeć pliki
wiosna.mp4, lato.mp4, jesien.mp4 i zima.mp4. Skrypt sprowadza je do 1280×720, łączy
płynnymi przejściami, lekko wyrównuje kolory i dodaje tytuły pór roku. Klipy źródłowe
nie są dołączone do projektu – leżą u autora.

Dźwięk nie pochodzi z klipów. Jest syntetyzowany w tym skrypcie osobno dla każdej pory roku
i zgrany z wydarzeniami w obrazie: ulewa, tęcza, jaskółki, klucz gęsi, zimowy wiatr.
"""
from pathlib import Path
import math
import subprocess
import sys
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'media/cztery-pory-roku.mp4'
POSTER = ROOT / 'media/plakat-filmu.webp'

W, H = 1280, 720
FPS = 24
SEASON = 4.5
DURATION = 18
MORPH = 0.5
SR = 44100

RAIN = (1.2, 2.9)
RAINBOW_AT = 3.3
SWALLOWS = (4.6, 9.0)
GEESE = (8.9, 13.6)

SEASONS = [
    {'title': 'WIOSNA', 'subtitle': 'Przyroda budzi się do życia', 'clip': 'wiosna*.mp4', 'at': 0.25, 'grade': (1.0, 1.0, 1.0, 1.0)},
    {'title': 'LATO', 'subtitle': 'Najdłuższe i najcieplejsze dni', 'clip': 'lato*.mp4', 'at': 0.25, 'grade': (1.08, 1.035, 0.96, 1.04)},
    {'title': 'JESIEŃ', 'subtitle': 'Chłodne poranki i kolorowe liście', 'clip': 'jesien*.mp4', 'at': 0.25, 'grade': (1.0, 1.0, 1.0, 1.0)},
    {'title': 'ZIMA', 'subtitle': 'Mróz, śnieg i długie noce', 'clip': 'zima*.mp4', 'at': 0.25, 'grade': (1.0, 1.0, 1.0, 1.0)},
]


def ease(u):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, u)))


def weights(t):
    w = [0.0] * 4
    index = min(3, int(t // SEASON))
    local = t - index * SEASON
    if index < 3 and local > SEASON - MORPH / 2:
        k = ease((local - (SEASON - MORPH / 2)) / MORPH)
        w[index], w[index + 1] = 1 - k, k
    elif index > 0 and local < MORPH / 2:
        k = ease((local + MORPH / 2) / MORPH)
        w[index - 1], w[index] = 1 - k, k
    else:
        w[index] = 1.0
    return w


def window(t, start, end, fade=0.8):
    return max(0.0, min(1.0, (t - start) / fade, (end - t) / fade))


class Clip:
    """Czyta kolejne klatki fragmentu klipu przez FFmpeg."""

    def __init__(self, path, start, length):
        self.size = W * H * 3
        self.process = subprocess.Popen([
            'ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-i', str(path), '-t', f'{length:.3f}',
            '-vf', f'scale={W}:-2:flags=lanczos,crop={W}:{H},unsharp=5:5:0.5', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
        ], stdout=subprocess.PIPE)
        self.index = -1
        self.frame = None

    def get(self, index):
        while self.index < index:
            data = self.process.stdout.read(self.size)
            if len(data) < self.size:
                break
            self.frame = np.frombuffer(data, np.uint8).reshape(H, W, 3)
            self.index += 1
        return self.frame

    def close(self):
        self.process.kill()
        self.process.wait()
        self.process.stdout.close()


def segment(index):
    start = max(0.0, index * SEASON - MORPH / 2)
    end = min(float(DURATION), (index + 1) * SEASON + MORPH / 2)
    return start, end


def open_clips(folder):
    clips = []
    for index, season in enumerate(SEASONS):
        found = sorted(Path(folder).glob(season['clip']))
        if not found:
            sys.exit(f'Brak klipu {season["clip"]} w folderze {folder}')
        start, end = segment(index)
        clips.append(Clip(found[0], season['at'] + start - index * SEASON, end - start + 0.2))
    return clips


def grade(frame, params):
    saturation, red, blue, contrast = params
    grey = frame.mean(-1, keepdims=True)
    frame = grey + (frame - grey) * saturation
    frame = frame * np.array((red, 1.0, blue), np.float32)
    return (frame - 0.5) * contrast + 0.5


def font(candidates, size):
    for path in candidates:
        try:
            return ImageFont.truetype(str(path), size)
        except OSError:
            continue
    return ImageFont.load_default(size)


TITLE_FONT = font([ROOT / 'fonts/inter-display-600.woff', 'C:/Windows/Fonts/segoeuib.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'], 60)
TEXT_FONT = font([ROOT / 'fonts/inter-500.woff', 'C:/Windows/Fonts/segoeui.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'], 27)
CHIP_FONT = font([ROOT / 'fonts/inter-600.woff', 'C:/Windows/Fonts/segoeuib.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'], 17)


def draw_titles(image, t, titles=True):
    d = ImageDraw.Draw(image, 'RGBA')
    d.rounded_rectangle((48, 44, 268, 84), radius=20, fill=(6, 14, 30, 120), outline=(160, 215, 255, 130), width=2)
    d.text((70, 54), 'METEOLIVE  /  PRO', font=CHIP_FONT, fill=(190, 232, 255, 255))
    index = min(3, int(t // SEASON))
    local = t - index * SEASON
    visible = max(0.0, min(1.0, (local - 0.5) / 0.6, (3.4 - local) / 0.6))
    if not titles or visible <= 0:
        return image
    rise = (1 - visible) * 12
    season = SEASONS[index]
    layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
    text = ImageDraw.Draw(layer)
    x, y = 52, 112 + rise
    text.text((x + 2, y + 4), season['title'], font=TITLE_FONT, fill=(0, 0, 0, 190))
    text.text((x + 3, y + 80), season['subtitle'], font=TEXT_FONT, fill=(0, 0, 0, 190))
    layer = layer.filter(ImageFilter.GaussianBlur(6))
    text = ImageDraw.Draw(layer)
    text.text((x, y), season['title'], font=TITLE_FONT, fill=(255, 255, 255, 255))
    text.text((x + 2, y + 76), season['subtitle'], font=TEXT_FONT, fill=(240, 245, 252, 255))
    layer.putalpha(layer.getchannel('A').point(lambda v: int(v * visible)))
    return Image.alpha_composite(image.convert('RGBA'), layer).convert('RGB')


def compose(clips, i, titles=True):
    t = i / FPS
    w = weights(t)
    frame = np.zeros((H, W, 3), np.float32)
    for index, weight in enumerate(w):
        if weight <= 0:
            continue
        start, _ = segment(index)
        image = clips[index].get(int(round((t - start) * FPS)))
        frame += grade(image.astype(np.float32) / 255, SEASONS[index]['grade']) * weight
    fade = max(0.0, min(1.0, t / 0.5, (DURATION - t) / 0.8))
    image = Image.fromarray(np.uint8(np.clip(frame * fade * 255, 0, 255)), 'RGB')
    return draw_titles(image, t, titles) if fade > 0.05 else image


NS = SR * DURATION
T = np.arange(NS) / SR
ARNG = np.random.default_rng(11)


def filtered(signal, low=None, high=None, order=4):
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    gain = np.ones_like(freqs)
    if low:
        gain /= np.sqrt(1 + (low / np.maximum(freqs, 1e-3)) ** (2 * order))
    if high:
        gain /= np.sqrt(1 + (freqs / high) ** (2 * order))
    out = np.fft.irfft(np.fft.rfft(signal) * gain, len(signal))
    return out / (np.abs(out).max() + 1e-9)


def noise(count, low=None, high=None):
    return filtered(ARNG.standard_normal(count), low, high)


def envelope(rate, floor=0.3):
    return floor + (1 - floor) * np.clip(0.5 + 0.5 * noise(NS, None, rate) * 1.6, 0, 1) ** 2


def pan(mono, position):
    angle = (position + 1) * math.pi / 4
    return np.stack([mono * math.cos(angle), mono * math.sin(angle)])


def place(buffer, start, sound, position=0.0):
    i = int(start * SR)
    if i < 0 or i >= NS:
        return
    j = min(NS, i + len(sound))
    buffer[:, i:j] += pan(sound[: j - i], position)


def season_gain(index):
    gains = np.array([weights(t)[index] for t in np.arange(0, DURATION, 0.01)])
    return np.interp(T, np.arange(0, DURATION, 0.01), gains)


def stereo(low, high, level):
    return np.stack([noise(NS, low, high), noise(NS, low, high)]) * level


def span(start, end, fade=0.6):
    return np.clip(np.minimum((T - start) / fade, (end - T) / fade), 0, 1)


def bird_phrase(base, notes):
    parts = []
    for n in range(notes):
        length = ARNG.uniform(0.045, 0.09)
        tt = np.arange(int(length * SR)) / SR
        start = base * ARNG.uniform(0.92, 1.12) * (1 - 0.035 * n)
        freq = start * (1 + ARNG.uniform(0.15, 0.32) * (1 - tt / length)) * (1 + 0.05 * np.sin(math.tau * ARNG.uniform(35, 60) * tt))
        phase = math.tau * np.cumsum(freq) / SR
        parts.append((np.sin(phase) + 0.22 * np.sin(2 * phase)) * np.sin(math.pi * tt / length) ** 1.5)
        parts.append(np.zeros(int(ARNG.uniform(0.025, 0.07) * SR)))
    return np.concatenate(parts)


def note(freq, length, decay, harmonics=((1, 1.0), (2, 0.35), (3, 0.12))):
    tt = np.arange(int(length * SR)) / SR
    tone = sum(a * np.sin(math.tau * freq * m * tt) * np.exp(-tt / (decay / m ** 0.6)) for m, a in harmonics)
    return tone * np.minimum(1, tt / 0.006)


def melody(out, start, freqs, step, level, decay=1.2):
    for k, f in enumerate(freqs):
        place(out, start + k * step, note(f, decay * 2, decay) * level, -0.3 + 0.6 * (k % 3) / 2)


def spring_sound():
    out = stereo(150, 1500, 0.05) * envelope(0.6)
    for base, level, position in [(3300, 0.12, -0.5), (4300, 0.09, 0.6), (3800, 0.08, 0.1)]:
        when = ARNG.uniform(0.2, 0.6)
        while when < SEASON + 0.6:
            phrase = bird_phrase(base, int(ARNG.integers(3, 7)))
            quiet = 0.45 if RAIN[0] < when < RAIN[1] else 1.0
            place(out, when, phrase * level * quiet, position)
            when += len(phrase) / SR + ARNG.uniform(0.3, 0.9)
    rain = span(*RAIN, 0.45) * (0.65 + 0.35 * span(1.6, 2.6, 0.4))
    out += (stereo(400, 8000, 0.18) + stereo(2000, 9000, 0.07)) * rain
    out += stereo(500, 3000, 0.05) * envelope(8, 0.0) * rain
    melody(out, RAINBOW_AT, [523.25, 659.25, 783.99, 1046.5, 783.99, 880.0], 0.42, 0.05)
    return out


def summer_sound():
    out = stereo(150, 1300, 0.05) * envelope(0.5)
    chirp = np.sin(math.tau * 4600 * T) * (np.sin(math.tau * 34 * T) > 0.2) * (0.5 + 0.5 * np.sin(math.tau * 2.1 * T)) ** 2
    out += np.stack([chirp, np.roll(chirp, 900)]) * 0.035
    when = SWALLOWS[0]
    while when < SWALLOWS[1]:
        place(out, when, bird_phrase(5200, int(ARNG.integers(2, 5))) * 0.06, ARNG.uniform(-0.8, 0.8))
        when += ARNG.uniform(0.18, 0.45)
    chord = sum(np.sin(math.tau * f * T) for f in (349.23, 440.0, 523.25)) / 3
    out += np.stack([chord, chord]) * 0.035 * (0.7 + 0.3 * np.sin(math.tau * 0.25 * T))
    return out


def honk(pitch=330, length=0.32):
    tt = np.arange(int(length * SR)) / SR
    freq = pitch * (1 + 0.15 * np.sin(math.pi * tt / length)) * (1 - 0.1 * tt / length)
    phase = math.tau * np.cumsum(freq) / SR
    tone = sum(a * np.sin(m * phase) for m, a in ((1, 1.0), (2, 0.7), (3, 0.5), (4, 0.3), (5, 0.2)))
    return filtered(tone * np.sin(math.pi * tt / length) ** 0.7, 200, 2500)


def autumn_sound():
    out = stereo(200, 1200, 0.14) * envelope(0.6, 0.15)
    out += stereo(2200, 7000, 0.08) * envelope(5, 0.0)
    when = GEESE[0] + 0.3
    while when < GEESE[1] - 0.3:
        position = -0.8 + 1.6 * (when - GEESE[0]) / (GEESE[1] - GEESE[0])
        place(out, when, honk(ARNG.uniform(300, 360), ARNG.uniform(0.26, 0.36)) * 0.08 * window(when, *GEESE, 0.6), position)
        when += ARNG.uniform(0.28, 0.55)
    melody(out, 2 * SEASON + 0.4, [440.0, 523.25, 659.25, 587.33, 523.25, 440.0], 0.62, 0.04, 1.4)
    return out


def winter_sound():
    howl = np.zeros(NS)
    raw = ARNG.standard_normal(NS)
    for centre in (420, 610, 880):
        howl += filtered(raw, centre * 0.9, centre * 1.1, 6)
    out = np.stack([howl, np.roll(howl, 2000)]) / 3 * 0.12 * envelope(0.4, 0.2)
    out += stereo(3000, 9000, 0.03)
    melody(out, 3 * SEASON + 0.6, [1318.5, 987.77, 1174.7, 1567.98, 1318.5], 0.68, 0.035, 1.6)
    return out


def make_audio(path):
    mix_ = spring_sound() * season_gain(0) * 0.85 + summer_sound() * season_gain(1) * 1.9 + autumn_sound() * season_gain(2) + winter_sound() * season_gain(3) * 1.4
    mix_ *= np.clip(np.minimum(T / 0.4, (DURATION - T) / 0.9), 0, 1)
    mix_ *= 10 ** (-19 / 20) / np.sqrt(np.mean(mix_ ** 2))
    mix_ = 0.89 * np.tanh(mix_ / 0.89)
    pcm = (mix_.T * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(SR)
        file.writeframes(pcm.tobytes())


def poster(folder, t=10.0):
    clips = open_clips(folder)
    image = compose(clips, int(t * FPS), titles=False)
    for clip in clips:
        clip.close()
    image.resize((960, 540), Image.LANCZOS).save(POSTER, quality=78, method=6)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('Podaj folder z klipami, np.: python docs/generuj_film.py C:/Users/ja/Pobrane/klipy')
    folder = sys.argv[1]
    with tempfile.TemporaryDirectory() as tmp:
        audio = Path(tmp) / 'audio.wav'
        make_audio(audio)
        encoder = subprocess.Popen([
            'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
            '-i', str(audio), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', str(OUT)
        ], stdin=subprocess.PIPE)
        clips = open_clips(folder)
        for i in range(DURATION * FPS):
            encoder.stdin.write(compose(clips, i).tobytes())
            if i % 48 == 0:
                print(f'klatka {i}/{DURATION * FPS}', flush=True)
        for clip in clips:
            clip.close()
        encoder.stdin.close()
        encoder.wait()
    poster(folder)
    print('Film zapisany:', OUT, 'plakat:', POSTER)
