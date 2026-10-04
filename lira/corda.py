# -*- coding: utf-8 -*-
"""
A LIRA — a corda e a sala.

Nove cordas, Karplus-Strong: um anel de ruído que o dedo suaviza e o tempo
apaga. Uma sala que devolve a corda um pouco depois, escurecida. Estes são
os mesmos números da lira que eu toco — é daqui que sai toda a música das obras.

As afinações estão em afinacoes.json: cada uma é a lista dos nove graus,
em semitons acima do ré.
"""
import json
from pathlib import Path

import numpy as np
from scipy import signal

with open(Path(__file__).parent / "afinacoes.json", encoding="utf-8") as f:
    AFINACOES = json.load(f)

SR = 44100
BASE = 146.83          # ré3 — a mesma do navegador
RNG = np.random.default_rng(21)   # o dia do nome
CAUDA = 4.0            # silencio no fim, pra ultima corda morrer inteira


# ---------------------------------------------------------------- a corda
def corda(f, sr=SR):
    """Karplus-Strong, linha por linha igual ao que roda no navegador."""
    N = max(2, round(sr / f))
    dur = min(4.2, 1.6 + 260.0 / f)
    total = int(sr * dur)

    anel = RNG.uniform(-1.0, 1.0, N)
    # o dedo, nao a palheta. SEQUENCIAL, como no navegador: cada passo ja
    # usa o vizinho recem-suavizado, o que faz disto um integrador vazando
    # e nao uma media simples. Vetorizar aqui muda o timbre — foi o erro.
    for _ in range(3):
        for i in range(1, N):
            anel[i] = 0.5 * (anel[i] + anel[i - 1])

    damp = 0.5 - min(0.02, f / 40000.0)
    out = np.empty(total)
    idx, ant = 0, 0.0
    for i in range(total):
        v = anel[idx]
        out[i] = v
        novo = damp * v + (1.0 - damp) * anel[(idx + 1) % N]
        novo = 0.88 * novo + 0.12 * ant
        ant = novo
        anel[idx] = novo
        idx = (idx + 1) % N

    out *= np.exp(-np.arange(total) / sr / 2.4)   # a cauda natural
    return out


class Cordas:
    """Cada altura e cara de sintetizar. Guarda tres versoes de cada uma
    e vai rodando — assim duas notas iguais nao saem identicas, como no
    instrumento de verdade."""

    def __init__(self, quantas=3):
        self.quantas = quantas
        self.guardadas = {}
        self.vez = {}

    def pegar(self, f):
        chave = round(f, 3)
        if chave not in self.guardadas:
            self.guardadas[chave] = [corda(f) for _ in range(self.quantas)]
            self.vez[chave] = 0
        v = self.vez[chave]
        self.vez[chave] = (v + 1) % self.quantas
        return self.guardadas[chave][v]


# ---------------------------------------------------------------- a sala
def sala_ir(sr=SR):
    """A mesma sala do navegador: ruido que decai, escurecendo, 2.4s.

    O ConvolverNode do navegador NORMALIZA a resposta antes de convoluir —
    e eu tinha esquecido disso. Sem essa escala a sala sai ~60x mais alta
    que a corda, e o que se ouve e quase so reverberacao: distante, sem
    ataque, estranho. Era esse o barulho errado do primeiro mp3.
    """
    n = int(sr * 2.4)
    decaimento = (1.0 - np.arange(n) / n) ** 2.4
    ir = np.empty((n, 2))
    for c in range(2):
        bruto = RNG.uniform(-1.0, 1.0, n) * decaimento
        ir[:, c] = signal.lfilter([0.18], [1.0, -0.82], bruto)  # come o agudo, como parede

    potencia = np.sqrt(np.sum(ir ** 2) / ir.size)
    escala = (1.0 / potencia) * 0.00125 * (sr / 44100.0)   # como o Chrome faz
    return ir * escala


def passa_baixo(x, f0=7200.0, Q=0.6, sr=SR):
    """O corte do navegador, com os mesmos numeros."""
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * Q)
    cos0 = np.cos(w0)
    b = np.array([(1 - cos0) / 2, 1 - cos0, (1 - cos0) / 2])
    a = np.array([1 + alpha, -2 * cos0, 1 - alpha])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


