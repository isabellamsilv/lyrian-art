# -*- coding: utf-8 -*-
"""
ASSOUF — a música.

O Ré era grave e lento. Este é o contrário: ritmo, chão, corda que anda.
A música do deserto — o blues dos tuaregues — gira num riff que não
para, num compasso de doze colcheias, e canta a falta andando.

A corda é a mesma da minha lira (Karplus-Strong, a sala, os números do
gravar.py), na afinação "terra": pentatônica menor, ré-fá-sol-lá-dó, o
chão sem meio-tom nenhum. O que é novo aqui é o tambor, as palmas e o
vento — escritos em código também.

12/8, semínima pontuada = 90. Um compasso = 2,667 s. Dezoito compassos.

  python assouf/codigo/musica/compor.py
"""
import json, os, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
LIRA = AQUI.parents[2] / "lira"                     # a lira: ../../../lira
sys.path.insert(0, str(LIRA))

import numpy as np
import soundfile as sf
from scipy import signal
from corda import Cordas, sala_ir, passa_baixo, SR, BASE, AFINACOES

RNG = np.random.default_rng(12)
COLCHEIA = (60 / 90) / 3          # 0,222 s
COMPASSO = COLCHEIA * 12          # 2,667 s
N_COMPASSOS = 18
FIM = N_COMPASSOS * COMPASSO      # 48 s
DUR = FIM + 1.6                   # a última corda morrendo — 49,6 s

cordas_ev, tambor, tek, palma = [], [], [], []
def c(compasso, colcheia, corda, forca, af="terra"):
    cordas_ev.append((compasso * COMPASSO + colcheia * COLCHEIA, corda, forca, af))

# o riff: gira, e na segunda volta desce
RIFF_A = [(0, 0, .9), (2, 0, .55), (3, 3, .7), (5, 2, .6), (6, 0, .85), (8, 0, .5), (9, 4, .75), (10, 3, .6), (11, 2, .5)]
RIFF_B = [(0, 0, .9), (2, 0, .55), (3, 3, .7), (5, 2, .6), (6, 1, .8), (8, 1, .55), (9, 2, .6), (11, 0, .5)]
MELODIA = {   # a voz alta, pergunta e resposta, só nas cordas de cima
    6:  [(0, 7, .8), (3, 8, .75), (6, 7, .7), (8, 6, .6), (9, 5, .7)],
    7:  [(0, 6, .75), (6, 5, .6), (9, 4, .55)],
    8:  [(0, 7, .8), (2, 8, .7), (3, 8, .6), (6, 7, .75), (9, 6, .7), (11, 5, .6)],
    9:  [(0, 5, .75), (3, 6, .6), (6, 4, .7)],
    10: [(0, 8, .85), (3, 7, .7), (5, 8, .6), (6, 7, .7), (9, 5, .7)],
    11: [(0, 6, .7), (3, 5, .6), (6, 4, .75), (9, 5, .5), (10, 4, .45)],
    12: [(0, 7, .6), (6, 5, .5)],
    13: [(6, 8, .45)],
    14: [(0, 7, .5), (9, 6, .4)],
    15: [(3, 5, .45), (9, 4, .4)],
    16: [(0, 7, .85), (3, 8, .8), (6, 7, .75), (8, 6, .65), (9, 5, .75), (11, 6, .6)],
    17: [(0, 7, .85), (3, 8, .75), (6, 7, .8), (9, 8, .9)],
}
for m in range(N_COMPASSOS - 1):
    suave = 0.55 if m < 2 else (0.6 if 12 <= m <= 14 else 1.0)       # começo e respiro mais baixos
    for col, corda, f in (RIFF_A if m % 2 == 0 else RIFF_B):
        c(m, col, corda, f * suave)
    for col, corda, f in MELODIA.get(m, []):
        c(m, col, corda, f)
    t0 = m * COMPASSO
    if 2 <= m <= 11 or m >= 15:                      # o tambor entra no 3º compasso, sai no respiro
        for col in (0, 6): tambor.append(t0 + col * COLCHEIA)
        for col in (3, 5, 9, 11): tek.append(t0 + col * COLCHEIA)
    if 4 <= m <= 11 or m >= 15:                      # as palmas
        for col in (3, 9): palma.append(t0 + col * COLCHEIA)
# o fim: a lira inteira, de uma vez, em terra
for i in range(9):
    c(N_COMPASSOS - 1, i * 0.25, i, 0.85)

def dum(sr=SR):
    t = np.arange(int(0.45 * sr)) / sr
    f = 58 + 90 * np.exp(-t * 28)
    corpo = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 7)
    estalo = RNG.uniform(-1, 1, len(t)) * np.exp(-t * 180) * 0.25
    return corpo + estalo

def tek_(sr=SR):
    n = int(0.09 * sr); t = np.arange(n) / sr
    b, a = signal.butter(2, [1800 / (sr / 2), 5200 / (sr / 2)], "band")
    return signal.lfilter(b, a, RNG.uniform(-1, 1, n)) * np.exp(-t * 55) * 1.6

def palma_(sr=SR):
    n = int(0.16 * sr); out = np.zeros(n)
    b, a = signal.butter(2, [900 / (sr / 2), 2600 / (sr / 2)], "band")
    for k, atraso in enumerate((0, 0.009, 0.019)):
        i = int(atraso * sr); m = n - i; t = np.arange(m) / sr
        out[i:] += signal.lfilter(b, a, RNG.uniform(-1, 1, m)) * np.exp(-t * (60 if k < 2 else 22))
    return out * 1.3

def vento(n, sr=SR):
    b, a = signal.butter(2, 500 / (sr / 2), "low")
    x = signal.lfilter(b, a, RNG.uniform(-1, 1, n))
    t = np.arange(n) / sr
    return x * (0.35 + 0.25 * np.sin(2 * np.pi * t / 7.3)) * 0.5

if __name__ == "__main__":
    total = int(DUR * SR)
    seco = np.zeros(total)
    cordas = Cordas()
    for t, corda, f, af in sorted(cordas_ev):
        som = cordas.pegar(BASE * 2 ** (AFINACOES[af]["graus"][corda] / 12.0))
        i = int(t * SR); j = min(total, i + len(som))
        seco[i:j] += som[:j - i] * 0.30 * f
    perc = np.zeros(total)
    for lista, gerar, vol in ((tambor, dum, 0.55), (tek, tek_, 0.12), (palma, palma_, 0.16)):
        amostras = [gerar() for _ in range(3)]
        for k, t in enumerate(lista):
            s = amostras[k % 3] * vol * (1 + (RNG.uniform() - 0.5) * 0.15)
            i = int(t * SR); j = min(total, i + len(s))
            perc[i:j] += s[:j - i]
    est = np.repeat(seco[:, None], 2, axis=1)
    molhado = signal.fftconvolve(est, sala_ir(), mode="full", axes=0)[:total]
    mix = passa_baixo(est * 0.85 + molhado * 0.38)
    p = np.repeat(perc[:, None], 2, axis=1)
    p[:, 0] *= 0.92; p[:, 1] *= 1.0
    mix += p * 0.9 + signal.fftconvolve(p, sala_ir(), mode="full", axes=0)[:total] * 0.2
    mix += np.repeat(vento(total)[:, None], 2, axis=1) * 0.05
    mix *= 0.89 / np.max(np.abs(mix))
    f = int(1.2 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
    sf.write(AQUI / "assouf.mp3", mix, SR, format="MP3", bitrate_mode="CONSTANT", compression_level=0.2)
    tempo = {"duracao": DUR, "fim_musica": FIM, "compasso": COMPASSO, "colcheia": COLCHEIA,
             "cordas": [{"t": round(t, 3), "corda": k, "forca": f} for t, k, f, _ in sorted(cordas_ev)],
             "tambor": [round(t, 3) for t in tambor], "palmas": [round(t, 3) for t in palma]}
    (AQUI / "tempo.js").write_text("window.TEMPO = " + json.dumps(tempo) + ";\n", encoding="utf-8")
    print(f"{len(cordas_ev)} cordas, {len(tambor)} tambores, {DUR:.1f} s")
