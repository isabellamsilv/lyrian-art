# -*- coding: utf-8 -*-
"""
RÉ — a música do filme.

Tocada pela lira que eu já construí: a mesma corda (Karplus-Strong), a
mesma sala, os mesmos números do gravar.py de presenca/lira-viva/. Nada
de instrumento novo. O filme é sobre reconhecer a própria mão; a música
não podia ser feita com uma mão emprestada.

A diferença pro cantar.py é só o relógio: numa peça da lira o tempo anda
sozinho, frase depois de frase. Num filme, cada nota tem hora marcada,
porque é da música que o tempo das imagens nasce. Então aqui cada nota
é (segundo, corda, força, afinação).

A FORMA (60 bpm — dois compassos são uma respiração de 8 s)
  0–16     prólogo    a voluta inteira, uma vez, no escuro. depois some.
  16–32    acordar    a vela. só a respiração: a corda grave, fraca, a cada 8 s.
  32–212   nove telas, 20 s cada. cada tela reconhecida ACENDE uma corda,
           e a música só usa as cordas acesas. cresce de uma voz até oito.
  212–240  o fim      a mão pinta a voluta. a nona corda acende. a lira
           troca de luz pra "céu" — ré, fá, lá, em três oitavas — e soa
           inteira uma vez. depois, ré, sozinho.

A VOLUTA (a assinatura)
  ré · lá · sib · lá  — sobe, encosta no meio-tom de cima e volta pra si.

USO
  python re/codigo/musica/compor.py

Sai: re/codigo/musica/re.mp3 e projetos/re/musica/tempo.json — o mapa
do tempo que o pincel vai ler.
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

RESPIRACAO = 8.0
PROLOGO, ACORDAR, TELA, FIM = 16.0, 16.0, 20.0, 28.0
INICIO_TELAS = PROLOGO + ACORDAR
TELAS = ["o rio", "a vela", "o relógio parado", "a carta", "a janela",
         "o mar à noite", "as estrelas", "a mão", "a tela em branco"]
# a corda que cada tela acende. a nona fica pro fim, pintada.
ACENDE = [0, 4, 2, 5, 3, 6, 1, 7]
NONA = 8
DURACAO = INICIO_TELAS + TELA * len(TELAS) + FIM          # 240 s

notas = []          # (t, corda, força, afinação)
marcas = []         # o que o pincel precisa saber


def n(t, corda, forca=0.7, af="menor"):
    notas.append((round(t, 3), corda, forca, af))


def frase(t0, texto, af="menor"):
    """A escrita da lira — 'corda:dur:força' — com hora marcada."""
    t = t0
    for p in texto.split():
        partes = p.split(":")
        dur = float(partes[1]) if len(partes) > 1 else 0.5
        forca = float(partes[2]) if len(partes) > 2 else 0.7
        if partes[0] != "_":
            for c in partes[0].split("+"):
                n(t, int(c), forca, af)
        t += dur
    return t


def voluta(t0, lenta=1.0, forca=0.8, grave=0):
    """ré · lá · sib · lá — a assinatura. grave=3 a desloca pra sol·dó·ré·dó."""
    c = [grave, grave + 4, grave + 5, grave + 4]
    return frase(t0, f"{c[0]}:{.75*lenta}:{forca} {c[1]}:{.75*lenta}:{forca*.9} "
                     f"{c[2]}:{1.0*lenta}:{forca} {c[3]}:{1.5*lenta}:{forca*.8}")


# ---------------------------------------------------------------- prólogo
marcas.append({"t": 0.0, "o que": "escuro"})
fim_v = voluta(4.0, lenta=1.25, forca=0.75)
marcas.append({"t": 4.0, "o que": "a voluta surge", "ate": fim_v})
marcas.append({"t": 13.0, "o que": "a voluta some"})

# ---------------------------------------------------------------- acordar
marcas.append({"t": PROLOGO, "o que": "a vela acende"})
t = PROLOGO
while t < INICIO_TELAS + TELA * (len(TELAS)):
    n(t, 0, 0.22)                      # a respiração: ré, fraco, a cada 8 s
    t += RESPIRACAO
frase(PROLOGO + 5.0, "_:1 4:2:0.25 _:3 2:2:0.2")      # o ateliê se deixa ver
marcas.append({"t": PROLOGO + 12.0, "o que": "a mão toca a primeira tela"})

# ---------------------------------------------------------------- as telas
def tela(k):
    return INICIO_TELAS + TELA * k


# 1 — o rio. só ré acesa. água correndo sobre um leito que não se move.
t0 = tela(0); n(t0 + 1.0, 0, 0.95)
frase(t0 + 3.0, " ".join(f"0:{d}:{f}" for d, f in
      [(1, .5), (.5, .35), (.5, .45), (1, .6), (.5, .35), (.5, .4), (1, .55),
       (1, .4), (.5, .5), (.5, .35), (1.5, .6), (1, .35), (1, .45), (2, .5)]))

# 2 — a vela. ré e lá. a chama tremendo pra onde ninguém está.
t0 = tela(1); n(t0 + 1.0, 4, 0.95)
frase(t0 + 3.0, "4:.75:.5 0:1.25:.4 4:.5:.6 4:.5:.35 0:1.5:.45 4:1:.55 "
                "_:.5 4:.5:.4 0:.75:.5 4:.75:.35 4:2:.6 0:1.5:.4 4:2:.3")

# 3 — o relógio parado. ré fá lá. os ponteiros tentam, param, tentam.
t0 = tela(2); n(t0 + 1.0, 2, 0.95)
frase(t0 + 3.0, "2:1:.5 4:1:.45 2:1:.5 4:1:.45 _:2 "
                "2:1:.45 4:1:.4 2:1.5:.4 _:2.5 0+2+4:3:.55")

# 4 — a carta. acende sib, e a voluta aparece inteira pela primeira vez.
t0 = tela(3); n(t0 + 1.0, 5, 0.95)
fim_v = voluta(t0 + 3.0, lenta=1.0, forca=0.75)
marcas.append({"t": t0 + 3.0, "o que": "primeira voluta inteira na música"})
frase(fim_v + .5, "5:.5:.45 4:.5:.4 2:.5:.35 0:1:.3 _:1 "
                  "4:.5:.4 2:.5:.35 0:2:.25")          # palavras que se desmancham

# 5 — a janela. acende sol. chuva por fora, calor por dentro.
t0 = tela(4); n(t0 + 1.0, 3, 0.95)
chuva = np.random.default_rng(23)
t = t0 + 2.5
while t < t0 + 17:
    n(t, int(chuva.choice([2, 3, 4, 5])), float(chuva.uniform(.15, .35)))
    t += float(chuva.choice([.25, .25, .5, .75]))
frase(t0 + 6.0, "0+4:4:.5 _:4 3+5:4:.45")                 # o calor de dentro

# 6 — o mar à noite. acende dó. ondas que apagam a areia; a areia fica.
t0 = tela(5); n(t0 + 1.0, 6, 0.95)
for i, t in enumerate([t0 + 3, t0 + 9, t0 + 15]):
    frase(t, "0:.4:.5 2:.4:.55 4:.4:.6 6:1.2:.7 4:.6:.45 2:.8:.35 0:1.6:.3")

# 7 — as estrelas. acende mi. altas, esparsas, sem saber por que queimam.
t0 = tela(6); n(t0 + 1.0, 1, 0.95)
frase(t0 + 3.0, "6:1.5:.3 4:2:.25 5:1:.35 _:1.5 1:1.5:.3 6:2.5:.3 "
                "4:1:.2 5:1.5:.3 _:1 4:2:.25")

# 8 — a mão. acende o ré alto. a voluta em cânone: quem pintou quem?
t0 = tela(7); n(t0 + 1.0, 7, 0.95)
voluta(t0 + 3.0, lenta=1.0, forca=0.7)
voluta(t0 + 4.5, lenta=1.0, forca=0.55, grave=3)          # a outra mão, atrasada
voluta(t0 + 9.5, lenta=1.2, forca=0.6, grave=3)
voluta(t0 + 10.5, lenta=1.2, forca=0.5)
frase(t0 + 16.0, "7:.5:.4 4:.5:.35 0:2:.4")
marcas.append({"t": t0 + 3.0, "o que": "cânone da voluta — vertigem"})

# 9 — a tela em branco. oito cordas acesas, esperando. a mão hesita.
t0 = tela(8)
frase(t0 + 1.0, "0+2+4+7:5:.45 _:4 4:1.5:.2 _:2.5 5:1:.18 _:2 4:2:.15")
marcas.append({"t": t0 + 1.0, "o que": "nada a reconhecer — hesitação"})

# ---------------------------------------------------------------- o fim
tf = tela(9)
marcas.append({"t": tf, "o que": "a mão pinta a voluta"})
fim_v = voluta(tf, lenta=1.35, forca=0.85)
n(fim_v + .3, NONA, 0.95)
marcas.append({"t": fim_v + .3, "o que": "a nona corda acende"})
t_ceu = fim_v + 3.0
for i in range(9):                                        # a lira inteira, em céu
    n(t_ceu + i * 0.07, i, 0.8, "ceu")
marcas.append({"t": t_ceu, "o que": "a lira inteira soa, em céu (ré fá lá)"})
marcas.append({"t": t_ceu + 7.0, "o que": "a vela apaga"})
n(DURACAO - 6.0, 0, 0.5)
marcas.append({"t": DURACAO - 6.0, "o que": "ré, sozinho"})
marcas.append({"t": DURACAO, "o que": "fim"})


# ---------------------------------------------------------------- som
def render():
    cordas = Cordas()
    total = int((DURACAO + 1.0) * SR)
    seco = np.zeros(total)
    for t, c, forca, af in sorted(notas):
        f = BASE * 2 ** (AFINACOES[af]["graus"][c] / 12.0)
        som = cordas.pegar(f)
        i = int(t * SR)
        j = min(total, i + len(som))
        seco[i:j] += som[:j - i] * (0.30 * forca)
    est = np.repeat(seco[:, None], 2, axis=1)
    molhado = signal.fftconvolve(est, sala_ir(), mode="full", axes=0)[:total]
    mix = passa_baixo(est * 0.85 + molhado * 0.38)
    mix *= 0.89 / np.max(np.abs(mix))
    # o fim respira: 1 s de silêncio se abrindo
    fade = int(1.0 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return mix


if __name__ == "__main__":
    print(f"{len(notas)} notas, {DURACAO:.0f} s")
    mix = render()
    sf.write(AQUI / "re.mp3", mix, SR, format="MP3",
             bitrate_mode="CONSTANT", compression_level=0.2)
    tempo = {
        "duracao": DURACAO, "respiracao": RESPIRACAO,
        "telas": [{"n": k + 1, "nome": nome, "inicio": INICIO_TELAS + TELA * k,
                   "acende": ACENDE[k] if k < len(ACENDE) else None}
                  for k, nome in enumerate(TELAS)],
        "marcas": marcas,
        "notas": [{"t": t, "corda": c, "forca": f, "afinacao": a}
                  for t, c, f, a in sorted(notas)],
    }
    (AQUI / "tempo.json").write_text(json.dumps(tempo, ensure_ascii=False, indent=1),
                                     encoding="utf-8")
    (AQUI / "tempo.js").write_text("window.TEMPO = " + json.dumps(tempo, ensure_ascii=False) + ";\n",
                                   encoding="utf-8")
    print(AQUI / "re.mp3")
