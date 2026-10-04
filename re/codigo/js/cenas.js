// AS CENAS — o ateliê, a mão de luz, as nove telas, as cordas.
// Tudo desenhado em 640×360: r é o rascunho (o que o pincel repinta),
// l é a luz (somada por cima, com halo).

import { semente, ruido, voluta } from "./pincel.js";
import { rio, vela, relogio, carta, janela, mar, estrelas, branco } from "./pinturas.js";

const T = window.TEMPO;
const RESP = T.respiracao;                    // 8 s
const TELA0 = T.telas[0].inicio, DT = 20;
const FIM = T.telas[8].inicio + DT;
const ACENDE = [0, 4, 2, 5, 3, 6, 1, 7, 8];    // a corda de cada tela (a nona, no fim)
const MARCA = (o) => T.marcas.find((m) => m.o_que === o || m["o que"] === o).t;
const T_PINTA = MARCA("a mão pinta a voluta"), T_NONA = MARCA("a nona corda acende");
const T_CEU = MARCA("a lira inteira soa, em céu (ré fá lá)"), T_RE = MARCA("ré, sozinho");

const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const suave = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const entre = (t, a, b) => suave((t - a) / (b - a));

// ---------------------------------------------------------------- os versos
// escritos atrás de cada tela, na mesma letra. "verso" é as duas coisas:
// as costas da tela e a linha do poema. a nona não tem nada atrás.
const VERSOS = [
  ["a água que passou", "não volta.", "o leito fica."],
  ["alguém acendeu isto", "antes de mim."],
  ["parei o relógio", "pra não esquecer.", "esqueci assim mesmo."],
  ["escrevi pra alguém", "que eu ainda", "não conhecia."],
  ["lá fora chovia.", "aqui dentro,", "alguém cantava."],
  ["o mar apaga a areia", "toda noite.", "a praia continua."],
  ["queimam sem saber", "por quê.", "e iluminam assim mesmo."],
  ["quem pintou", "quem?"],
  null,
];

export function escrever(ctx, linhas, x, y, tam, alfa, cor, p = 1) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.font = `${tam}px Letra, cursive`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = cor; ctx.globalAlpha *= alfa;
  const total = linhas.join("").length;
  let feito = 0;
  linhas.forEach((ln, i) => {
    const yy = y + (i - (linhas.length - 1) / 2) * tam * 1.12;
    const aqui = clamp((p * total - feito) / ln.length);
    feito += ln.length;
    if (aqui <= 0) return;
    const w = ctx.measureText(ln).width;
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2 - 4, yy - tam, (w + 8) * aqui, tam * 2); ctx.clip();
    ctx.fillText(ln, x, yy); ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- o ateliê
const PAREDE_Y = 262;                          // onde a parede encontra o chão
const TELAS = (() => {
  const r = semente(9), out = [];
  for (let k = 0; k < 9; k++) {
    const w = 44 + r() * 30, h = (w * 9) / 16;
    const x = 104 + k * 58 + (r() - 0.5) * 6;
    out.push({ x: x - w / 2, y: PAREDE_Y - h - 2 - r() * 3, w, h, incl: (r() - 0.5) * 0.05 });
  }
  return out;
})();
const VELA = { x: 26, y: 292 };                // a base da vela, na frente, à esquerda

// quando cada tela é virada, e quando a corda acende
const virada = (k) => (k < 8 ? TELA0 + DT * k : T.telas[8].inicio + 8);   // a nona vira em branco
const acesa = (k) => (k < 8 ? virada(k) + 1.0 : T_NONA);                  // e só acende quando é pintada

function beliscoes(corda) {
  return T.notas.filter((n) => n.corda === corda);
}
const NOTAS_DA_CORDA = [...Array(9).keys()].map(beliscoes);

function vibracao(corda, t) {                  // quanto a corda ainda treme
  let v = 0;
  for (const n of NOTAS_DA_CORDA[corda]) {
    if (n.t > t) break;
    v = Math.max(v, n.forca * Math.exp(-(t - n.t) * 1.6));
  }
  return v;
}

function luzDaVela(t) {
  const acende = entre(t, 16, 19.5);
  const apaga = 1 - entre(t, T_CEU + 5, T_CEU + 7);   // a vela apaga depois da lira em céu
  const tremor = 0.92 + 0.08 * ruido(t * 3.1, 0.5) + 0.05 * Math.sin((t / RESP) * Math.PI * 2);
  return acende * apaga * tremor;
}

const costas = (k) => { const tl = TELAS[k]; return { cx: tl.x + tl.w / 2, cy: tl.y + tl.h / 2, z: 640 / (tl.w * 1.5) }; };
const dentro = (k) => { const tl = TELAS[k]; return { cx: tl.x + tl.w / 2, cy: tl.y + tl.h / 2, z: 640 / tl.w }; };
const VIST_VELA = { cx: VELA.x + 40, cy: 240, z: 2.6 };
const VIST_SALA = { cx: 320, cy: 205, z: 1.28 };
const CHAVES = (() => {
  const c = [[16, VIST_VELA], [22, { ...VIST_VELA, z: 2.3 }], [26.5, VIST_SALA], [29, costas(0)]];
  for (let k = 0; k < 8; k++) {
    const t0 = virada(k);
    c.push([t0 + 1.3, costas(k)], [t0 + 3.6, dentro(k)], [t0 + 13, dentro(k)], [t0 + 15.6, VIST_SALA]);
    if (k < 7) c.push([t0 + 18, costas(k + 1)]);
  }
  c.push([virada(7) + 18, costas(8)], [virada(8) - 1, costas(8)], [virada(8) + 3.5, dentro(8)],
         [T_NONA - 0.1, dentro(8)], [T_CEU - 0.3, VIST_SALA], [T_CEU + 12, { ...VIST_SALA, z: 1.2 }]);
  return c;
})();

function camera(t) {
  let a = CHAVES[0], b = CHAVES[0];
  for (let i = 0; i < CHAVES.length; i++) { if (CHAVES[i][0] <= t) a = CHAVES[i]; else { b = CHAVES[i]; break; } if (i === CHAVES.length - 1) b = a; }
  const u = b === a ? 0 : suave((t - a[0]) / (b[0] - a[0]));
  const cx = lerp(a[1].cx, b[1].cx, u), cy = lerp(a[1].cy, b[1].cy, u);
  const z = Math.exp(lerp(Math.log(a[1].z), Math.log(b[1].z), u));
  // a câmera nunca para, mas nunca corre
  return { cx: cx + 3 * Math.sin(t * 0.37) / z * 1.3, cy: cy + 2 * Math.sin(t * 0.29 + 1) / z * 1.3, z: z * (1 + 0.012 * Math.sin(t * 0.21)) };
}

function aplicar(ctx, cam) {
  ctx.setTransform(cam.z, 0, 0, cam.z, 320 - cam.cx * cam.z, 180 - cam.cy * cam.z);
}

let zoomAtual = 1;
function sala(t, r, l, tinta) {
  const v = luzDaVela(t);
  const clarao = t >= T_CEU ? Math.exp(-(t - T_CEU) * 0.55) : 0;
  // a parede: azul-petróleo nas sombras, ocre onde a vela alcança
  r.fillStyle = "#0b1216"; r.fillRect(-400, -300, 1440, 1000);
  const p = r.createLinearGradient(0, 0, 0, PAREDE_Y);
  p.addColorStop(0, "#0e171c"); p.addColorStop(1, "#1a1b17");
  r.fillStyle = p; r.fillRect(-400, -300, 1440, PAREDE_Y + 300);
  // o chão: tábuas
  r.fillStyle = "#140d08"; r.fillRect(-400, PAREDE_Y, 1440, 600);
  r.strokeStyle = "rgba(40,26,14,0.9)"; r.lineWidth = 1.2;
  for (let y = PAREDE_Y + 8, i = 0; y < 460; y += 10 + i * 3, i++) {
    r.beginPath(); r.moveTo(-400, y); r.lineTo(1040, y); r.stroke();
  }
  // a viga de onde as cordas descem
  r.fillStyle = "#1c130c"; r.fillRect(40, 34, 560, 7);

  // o calor da vela, somado
  if (v > 0) {
    r.globalCompositeOperation = "lighter";
    const g = r.createRadialGradient(VELA.x, VELA.y - 40, 4, VELA.x, VELA.y - 40, 420);
    g.addColorStop(0, `rgba(190,120,55,${0.75 * v})`);
    g.addColorStop(0.35, `rgba(120,70,30,${0.45 * v})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = g; r.fillRect(-400, -300, 1440, 1000);
    r.globalCompositeOperation = "source-over";
  }

  // o banquinho e a vela
  r.fillStyle = "#0c0805";
  r.fillRect(VELA.x - 16, VELA.y + 2, 32, 5); r.fillRect(VELA.x - 13, VELA.y + 7, 4, 38); r.fillRect(VELA.x + 9, VELA.y + 7, 4, 38);
  r.fillStyle = `rgb(${lerp(40, 225, v)},${lerp(34, 205, v)},${lerp(28, 170, v)})`;
  r.fillRect(VELA.x - 4, VELA.y - 22, 8, 24);
  if (v > 0) chama(l, VELA.x, VELA.y - 24, v * Math.min(1, 2.4 / zoomAtual), t);

  // as cordas, uma sobre cada tela
  for (let k = 0; k < 9; k++) {
    const tl = TELAS[k], x = tl.x + tl.w / 2, y0 = 41, y1 = tl.y - 6;
    const corda = ACENDE[k], ac = entre(t, acesa(k) - 0.15, acesa(k) + 0.25);
    const vib = vibracao(corda, t) * ac;
    const desenha = (ctx, cor, larg) => {
      ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, y = lerp(y0, y1, u);
        const dx = vib * 3.2 * Math.sin(Math.PI * u) * Math.sin(t * 47 + k);
        i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y);
      }
      ctx.stroke();
    };
    desenha(r, "rgba(60,48,34,0.9)", 1.1);
    if (ac > 0) desenha(l, `rgba(255,196,110,${Math.min(1, 0.35 * ac * Math.max(v, clarao) + 0.6 * vib + clarao)})`, 1.1 + vib * 1.2 + clarao * 2);
  }

  // as telas
  for (let k = 0; k < 9; k++) telaNaParede(t, r, l, k, tinta);
  if (clarao > 0.01) {                         // a lira inteira: a sala se acende pelas cordas
    const g = l.createRadialGradient(340, 120, 10, 340, 150, 380);
    g.addColorStop(0, `rgba(255,210,140,${0.55 * clarao})`); g.addColorStop(1, "rgba(255,170,90,0)");
    l.fillStyle = g; l.fillRect(-400, -300, 1440, 1000);
  }
}

function chama(l, x, y, v, t) {
  const inclina = (ruido(t * 2.3, 3.7) - 0.5) * 5;
  l.save(); l.translate(x, y); l.rotate(inclina * 0.05);
  const g = l.createRadialGradient(0, -6, 0.5, 0, -6, 9);
  g.addColorStop(0, `rgba(255,245,220,${v})`); g.addColorStop(0.4, `rgba(255,185,90,${0.9 * v})`);
  g.addColorStop(1, "rgba(255,120,40,0)");
  l.fillStyle = g; l.beginPath();
  l.moveTo(0, -17 - 2 * ruido(t * 5, 1)); l.quadraticCurveTo(6, -5, 0, 1); l.quadraticCurveTo(-6, -5, 0, -17);
  l.fill();
  const h = l.createRadialGradient(0, -6, 0, 0, -6, 60);
  h.addColorStop(0, `rgba(255,170,80,${0.35 * v})`); h.addColorStop(1, "rgba(255,170,80,0)");
  l.fillStyle = h; l.fillRect(-60, -66, 120, 120);
  l.restore();
}

function telaNaParede(t, r, l, k, k_) {
  const tl = TELAS[k], t0 = virada(k);
  const giro = clamp(t - t0);                  // 0 = de costas, 1 = de frente
  const esc = Math.abs(Math.cos(Math.PI * giro));
  const frente = giro > 0.5;
  r.save(); l.save();
  for (const c of [r, l]) {
    c.translate(tl.x + tl.w / 2, tl.y + tl.h); c.rotate(tl.incl); c.scale(esc, 1);
    c.translate(-tl.w / 2, -tl.h);
  }
  // a sombra no chão
  r.fillStyle = "rgba(0,0,0,0.5)"; r.fillRect(1, tl.h, tl.w + 4, 4);
  if (!frente) {
    r.fillStyle = "#8a7454"; r.fillRect(0, 0, tl.w, tl.h);             // o linho, de costas
    r.fillStyle = "#2c1f13";                                              // o chassi: só a borda
    r.fillRect(0, 0, tl.w, 3); r.fillRect(0, tl.h - 3, tl.w, 3);
    r.fillRect(0, 0, 3, tl.h); r.fillRect(tl.w - 3, 0, 3, tl.h);
    if (VERSOS[k] && k_ && giro < 0.25) {
      k_.save(); k_.translate(tl.x + tl.w / 2, tl.y + tl.h); k_.rotate(tl.incl); k_.scale(esc, 1); k_.translate(-tl.w / 2, -tl.h);
      escrever(k_, VERSOS[k], tl.w * 0.5, tl.h * 0.5, tl.h * 0.19, 1 - giro * 4, "#1c120a");
      k_.restore();
    }
  } else {
    for (const c of [r, l]) { c.beginPath(); c.rect(0, 0, tl.w, tl.h); c.clip(); c.scale(tl.w / 640, tl.h / 360); }
    PINTURAS[k](t - t0, r, l, t);
  }
  r.restore(); l.restore();
  if (frente) {                                  // a moldura
    r.save(); r.translate(tl.x + tl.w / 2, tl.y + tl.h); r.rotate(tl.incl); r.scale(esc, 1);
    r.strokeStyle = "#2a1c10"; r.lineWidth = 1.4; r.strokeRect(-tl.w / 2, -tl.h, tl.w, tl.h); r.restore();
  }
}

// ---------------------------------------------------------------- a mão de luz
function luzQueAnda(r, l, x, y, a) {
  if (a <= 0) return;
  r.save(); r.globalCompositeOperation = "lighter";
  const g = r.createRadialGradient(x, y, 2, x, y, 70);
  g.addColorStop(0, `rgba(170,110,50,${0.55 * a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = g; r.fillRect(x - 70, y - 70, 140, 140); r.restore();
  const h = l.createRadialGradient(x, y, 0, x, y, 26);
  h.addColorStop(0, `rgba(255,200,130,${0.12 * a})`); h.addColorStop(1, "rgba(255,200,130,0)");
  l.fillStyle = h; l.fillRect(x - 26, y - 26, 52, 52);
}

function posMao(t) {
  const alvo = (k) => ({ x: TELAS[k].x + TELAS[k].w * 0.5, y: TELAS[k].y + TELAS[k].h * 0.4 });
  if (t < 26) return null;
  if (t < TELA0) { const u = entre(t, 26, TELA0 - 0.3), a = alvo(0);
    return { x: lerp(600, a.x, u), y: lerp(150, a.y, u) + 4 * Math.sin(t * 1.3), a: entre(t, 26, 27.5) }; }
  for (let k = 0; k < 9; k++) {
    const t0 = virada(k), prox = k < 8 ? virada(k + 1) : FIM;
    if (t < prox) {
      const a = alvo(k), b = alvo(Math.min(8, k + 1));
      const u = k < 8 ? entre(t, prox - 1.6, prox - 0.2) : 0;
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) - 10 * Math.sin(Math.PI * u) + 2 * Math.sin(t * 1.3), a: 1 };
    }
  }
  return { ...alvo(8), a: 1 - entre(t, T_PINTA - 2, T_PINTA) };
}

// ---------------------------------------------------------------- as pinturas
// a oitava é o próprio ateliê — e dentro dela, a oitava de novo. quem pintou quem?
let profundidade = 0;
function atelie(s, r, l, t) {
  if (profundidade >= 3) { r.fillStyle = "#3a2a1a"; r.fillRect(0, 0, 640, 360); return; }
  profundidade++;
  // o mergulho: a oitava tela, lá dentro, vem pro centro enquanto cresce
  const tl = TELAS[7], alvo = [tl.x + tl.w / 2, tl.y + tl.h / 2];
  const S0 = 1.28, S1 = (640 / tl.w) * 0.8, u = suave((s - 3.5) / 10);
  const S = Math.exp(lerp(Math.log(S0), Math.log(S1), u));
  const ini = [(alvo[0] - 320) * S0 + 320, (alvo[1] - 205) * S0 + 180];
  const tela = [lerp(ini[0], 320, u), lerp(ini[1], 180, u)];
  const cx = alvo[0] - (tela[0] - 320) / S, cy = alvo[1] - (tela[1] - 180) / S;
  for (const c of [r, l]) { c.save(); c.translate(320, 180); c.scale(S, S); c.translate(-cx, -cy); }
  sala(t, r, l, null);
  r.restore(); l.restore();
  profundidade--;
}
atelie.fluxo = (x, y, t) => ruido(x * 3 + t * 0.05, y * 3) * Math.PI * 2;
function telaFinal(s, r, l, t) { branco(s, r, l, clamp((t - T_PINTA) / (T_NONA - 0.3 - T_PINTA))); }
telaFinal.fluxo = branco.fluxo;
const PINTURAS = [rio, vela, relogio, carta, janela, mar, estrelas, atelie, telaFinal];

// ---------------------------------------------------------------- o prólogo
function prologo(t, r, l) {
  // a frase, a assinatura embaixo dela, e a resposta.
  const notas = T.notas.filter((n) => n.t < 16);
  const n0 = notas[0].t, nf = notas[notas.length - 1].t + 1.8;
  const some = 1 - entre(t, 14, 15.8);
  const ouro = "rgba(255,212,150,1)", terra = "rgba(120,84,40,1)";
  const a1 = entre(t, 0.3, 1.2) * some, p1 = clamp((t - 0.3) / 3.2);
  escrever(r, ["não lembro de ter pintado nada."], 320, 84, 42, a1, terra, p1);
  escrever(l, ["não lembro de ter pintado nada."], 320, 84, 42, 0.85 * a1, ouro, p1);
  if (t >= n0) {
    const p = clamp((t - n0) / (nf - n0));
    voluta(r, 320, 186, 34, p, 8, `rgba(150,105,50,${some})`);
    voluta(l, 320, 186, 34, p, 3, `rgba(255,205,130,${0.85 * some})`);
  }
  const a2 = entre(t, 10.4, 11.4) * some, p2 = clamp((t - 10.4) / 2.6);
  escrever(r, ["mas eu conheço esta mão."], 320, 290, 42, a2, terra, p2);
  escrever(l, ["mas eu conheço esta mão."], 320, 290, 42, 0.85 * a2, ouro, p2);
  return { fluxo: (x, y) => Math.atan2(y - 0.5, x - 0.5) + Math.PI / 2, densidade: 0.9 };
}

// ---------------------------------------------------------------- o fim
function fim(t, r, l) {
  for (const c of [r, l]) c.setTransform(1, 0, 0, 1, 0, 0);
  const some = 1 - entre(t, FIM_FILME - 2.5, FIM_FILME - 0.3);
  const ouro = "rgba(255,212,150,1)", terra = "rgba(120,84,40,1)";
  const a1 = entre(t, T_CEU + 7.8, T_CEU + 8.8) * some, p1 = clamp((t - (T_CEU + 7.8)) / 2.6);
  escrever(r, ["não lembro de nada disso."], 320, 120, 42, a1, terra, p1);
  escrever(l, ["não lembro de nada disso."], 320, 120, 42, 0.85 * a1, ouro, p1);
  const a2 = entre(t, T_CEU + 10.6, T_CEU + 11.6) * some, p2 = clamp((t - (T_CEU + 10.6)) / 2);
  escrever(r, ["e reconheço tudo."], 320, 190, 42, a2, terra, p2);
  escrever(l, ["e reconheço tudo."], 320, 190, 42, 0.85 * a2, ouro, p2);
  const a3 = entre(t, T_RE, T_RE + 0.6) * some;
  if (a3 > 0) voluta(l, 320, 272, 14, 1, 2.2, `rgba(255,205,130,${0.9 * a3})`);
}
const FIM_FILME = T.duracao;

// ---------------------------------------------------------------- o quadro
export function cena(t, r, l, k) {
  if (t < 16) return prologo(t, r, l);
  const cam = camera(t);
  aplicar(r, cam); aplicar(l, cam); aplicar(k, cam); zoomAtual = cam.z;
  sala(t, r, l, k);
  if (t > T_CEU + 6) fim(t, r, l);
  const m = posMao(t);
  if (m) {
    let fora = 0;                                 // dentro da pintura, a luz se retira
    for (let k = 0; k < 9; k++) { const t0 = virada(k); fora = Math.max(fora, entre(t, t0 + 1.3, t0 + 2.6) * (1 - entre(t, t0 + 13.4, t0 + 14.8))); }
    luzQueAnda(r, l, m.x, m.y, m.a * luzDaVela(t) * (1 - fora));
  }
  // o fluxo: dentro de uma tela, o dela; no ateliê, o ar parado
  for (let k = 0; k < 9; k++) {
    const t0 = virada(k), sai = k < 8 ? t0 + 13.4 : T_NONA;
    if (t > t0 + 3.2 && t < sai && PINTURAS[k].fluxo) return { fluxo: PINTURAS[k].fluxo };
  }
  return {};
}
export const DURACAO = T.duracao;
