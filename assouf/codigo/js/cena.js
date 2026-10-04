// ASSOUF — o deserto à noite, em pé.
// Rascunho e luz em 360×640. O mundo é mais alto que a tela: o céu em cima
// (y 0..640), as dunas embaixo (y 560..1280). A câmera sobe e desce nele.

import { semente, ruido, voluta } from "./pincel.js";

const T = window.TEMPO;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const suave = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const entre = (t, a, b) => suave((t - a) / (b - a));
const FIM = T.fim_musica, COMP = T.compasso, COL = T.colcheia;

// ---------------------------------------------------------------- as palavras
// (entra, sai, linhas, tamanho)
const FALAS = [
  [1.0, 6.6, ["tem uma palavra que", "dizem não ter tradução."], 27],
  [7.4, 11.8, ["saudade."], 46],
  [12.6, 18.6, ["no Saara, os tuaregues", "têm uma irmã dela:"], 27],
  [19.6, 26.6, ["assouf."], 62],
  [27.4, 32.6, ["a falta de quem", "está longe."], 30],
  [33.6, 39.6, ["lá, a falta", "tem ritmo."], 32],
  [40.8, 47.2, ["ela caminha."], 42],
];

function escrever(ctx, linhas, x, y, tam, alfa, cor, p) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.font = `${tam}px Letra, cursive`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = cor; ctx.globalAlpha = alfa;
  const total = linhas.join("").length; let feito = 0;
  linhas.forEach((ln, i) => {
    const yy = y + (i - (linhas.length - 1) / 2) * tam * 1.15;
    const aqui = clamp((p * total - feito) / ln.length); feito += ln.length;
    if (aqui <= 0) return;
    const w = ctx.measureText(ln).width;
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2 - 4, yy - tam, (w + 8) * aqui, tam * 2); ctx.clip();
    ctx.fillText(ln, x, yy); ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- o ritmo
const bateu = (lista, t, decai) => {                 // quanto a última batida ainda soa
  let v = 0;
  for (const b of lista) { if (b > t) break; v = Math.exp(-(t - b) * decai); }
  return v;
};
const fase = (t) => (t / (COL * 3)) % 1;            // a semínima pontuada: o passo

// ---------------------------------------------------------------- o mundo
const ESTRELAS = (() => { const r = semente(3), o = []; for (let i = 0; i < 260; i++) o.push([r() * 360, r() * 640, r(), r()]); return o; })();
function ceu(t, r, l, finalAceso) {
  const g = r.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, "#05050f"); g.addColorStop(0.5, "#141430"); g.addColorStop(0.8, "#2c2140"); g.addColorStop(1, "#43304a");
  r.fillStyle = g; r.fillRect(-100, -100, 560, 1100);
  // a Via Láctea: poeira enrolada, atravessando
  r.save(); r.translate(180, 260); r.rotate(-0.5);
  const v = r.createLinearGradient(0, -60, 0, 60);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.5, "rgba(120,110,160,0.35)"); v.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = v; r.fillRect(-400, -60, 800, 120); r.restore();
  for (const [x, y, b, f] of ESTRELAS) {
    const br = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1 + f * 3) + f * 30))) * (1 + finalAceso * 1.5);
    l.fillStyle = `rgba(235,232,255,${Math.min(1, b * br)})`; l.fillRect(x, y, 1.2 + b * 1.2, 1.2 + b * 1.2);
  }
  // a lua, baixa e enorme
  const lx = 250, ly = 470;
  const h = l.createRadialGradient(lx, ly, 20, lx, ly, 160);
  h.addColorStop(0, "rgba(255,235,200,0.2)"); h.addColorStop(1, "rgba(255,235,200,0)");
  l.fillStyle = h; l.fillRect(lx - 160, ly - 160, 320, 320);
  r.fillStyle = "#d8cbae"; r.beginPath(); r.arc(lx, ly, 46, 0, Math.PI * 2); r.fill();
  l.fillStyle = "rgba(255,245,225,0.18)"; l.beginPath(); l.arc(lx, ly, 44, 0, Math.PI * 2); l.fill();
}

function duna(r, y0, amp, freq, fase_, corTopo, corBase, desl) {
  const g = r.createLinearGradient(0, y0 - amp, 0, y0 + 300);
  g.addColorStop(0, corTopo); g.addColorStop(1, corBase);
  r.fillStyle = g; r.beginPath(); r.moveTo(-100, 1400);
  for (let x = -100; x <= 460; x += 8) r.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin((x + desl) * freq + fase_)) - 14 * ruido((x + desl) * 0.02, fase_));
  r.lineTo(460, 1400); r.fill();
}
const cristaY = (x, desl) => 880 - 40 * (0.5 + 0.5 * Math.sin((x + desl) * 0.012 + 2)) - 14 * ruido((x + desl) * 0.02, 2);

// a caravana: camelos e gente, em silhueta, andando no passo da música
function camelo(r, l, x, y, s, passo, lanterna, t) {
  r.save(); r.translate(x, y); r.scale(s, s);
  r.fillStyle = "#0a0710"; r.strokeStyle = "#0a0710"; r.lineCap = "round";
  const sobe = Math.abs(Math.sin(passo * Math.PI)) * 1.5;
  r.translate(0, -sobe);
  r.beginPath(); r.ellipse(0, -26, 20, 9, 0, 0, Math.PI * 2); r.fill();                 // o corpo
  r.beginPath(); r.ellipse(-2, -35, 9, 8, 0, 0, Math.PI * 2); r.fill();                 // a corcova
  r.lineWidth = 5; r.beginPath(); r.moveTo(-17, -28); r.quadraticCurveTo(-28, -32, -27, -46); r.stroke(); // o pescoço
  r.beginPath(); r.ellipse(-30, -47, 6, 3.5, -0.3, 0, Math.PI * 2); r.fill();           // a cabeça
  r.lineWidth = 3;
  for (const [px, ph] of [[-13, 0], [-8, 0.5], [10, 0.5], [15, 0]]) {                  // as pernas
    const a = Math.sin((passo + ph) * Math.PI * 2) * 0.35;
    r.beginPath(); r.moveTo(px, -20); r.lineTo(px + Math.sin(a) * 16, -20 + Math.cos(a) * 21 + sobe); r.stroke();
  }
  // quem vai em cima, de manto
  r.beginPath(); r.moveTo(-6, -42); r.lineTo(4, -42); r.lineTo(2, -60); r.lineTo(-4, -60); r.fill();
  r.beginPath(); r.arc(-1, -64, 4, 0, Math.PI * 2); r.fill();
  r.restore();
  if (lanterna > 0) {
    const lx = x - 12 * s, ly = y - 44 * s - sobe * s;
    const g = l.createRadialGradient(lx, ly, 0, lx, ly, 26 * s);
    g.addColorStop(0, `rgba(255,200,110,${lanterna})`); g.addColorStop(1, "rgba(255,160,70,0)");
    l.fillStyle = g; l.fillRect(lx - 26 * s, ly - 26 * s, 52 * s, 52 * s);
    l.fillStyle = `rgba(255,235,190,${lanterna})`; l.beginPath(); l.arc(lx, ly, 1.6 * s, 0, Math.PI * 2); l.fill();
  }
}

function fogo(r, l, x, y, t, batida, final_) {
  // a fogueira do acampamento, embaixo, perto
  r.fillStyle = "#120a08"; r.beginPath(); r.ellipse(x, y + 8, 40, 9, 0, 0, Math.PI * 2); r.fill();
  const alt = 34 + 10 * batida + 6 * ruido(t * 4, 1) + 20 * final_;
  const g = l.createRadialGradient(x, y - alt * 0.4, 2, x, y - alt * 0.4, alt);
  g.addColorStop(0, "rgba(255,240,200,0.95)"); g.addColorStop(0.35, "rgba(255,160,60,0.8)"); g.addColorStop(1, "rgba(255,90,20,0)");
  l.fillStyle = g; l.beginPath();
  l.moveTo(x - 20, y); l.quadraticCurveTo(x - 16 + 6 * ruido(t * 3, 2), y - alt * 0.7, x + 3 * Math.sin(t * 5), y - alt);
  l.quadraticCurveTo(x + 18, y - alt * 0.6, x + 20, y); l.fill();
  const h = l.createRadialGradient(x, y - 10, 0, x, y - 10, 170);
  h.addColorStop(0, `rgba(255,150,60,${0.35 + 0.15 * batida})`); h.addColorStop(1, "rgba(255,150,60,0)");
  l.fillStyle = h; l.fillRect(x - 170, y - 180, 340, 340);
  r.save(); r.globalCompositeOperation = "lighter";
  const q = r.createRadialGradient(x, y, 0, x, y, 200);
  q.addColorStop(0, "rgba(150,80,30,0.6)"); q.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = q; r.fillRect(x - 200, y - 200, 400, 400); r.restore();
  // as faíscas: nascem a cada tambor e sobem enrolando
  for (const b of T.tambor) {
    const s = t - b; if (s < 0 || s > 2.6) continue;
    const rr = semente(Math.round(b * 1000));
    for (let i = 0; i < 5; i++) {
      const vx = (rr() - 0.5) * 30, vy = 50 + rr() * 50, gira = rr() * 6;
      const px = x + vx * s + 8 * Math.sin(s * 3 + gira), py = y - 20 - vy * s;
      l.fillStyle = `rgba(255,${180 + rr() * 60},90,${(1 - s / 2.6) * 0.9})`; l.fillRect(px, py, 1.8, 1.8);
    }
  }
}

function camera(t) {
  const chaves = [[0, 330], [9, 330], [15, 860], [32, 880], [36.5, 420], [40.5, 880], [49.6, 880]];
  let a = chaves[0], b = chaves[chaves.length - 1];
  for (let i = 0; i < chaves.length - 1; i++) if (t >= chaves[i][0] && t < chaves[i + 1][0]) { a = chaves[i]; b = chaves[i + 1]; break; }
  const u = t >= b[0] ? 1 : suave((t - a[0]) / (b[0] - a[0]));
  return lerp(a[1], b[1], u) + 3 * Math.sin(t * 0.4);
}

// ---------------------------------------------------------------- o quadro
export function cena(t, r, l) {
  const cy = camera(t);
  const final_ = t >= FIM - COMP ? Math.exp(-(t - (FIM - COMP)) * 0.5) * entre(t, FIM - COMP, FIM - COMP + 0.4) : 0;
  const tambor = bateu(T.tambor, t, 9), palma = bateu(T.palmas, t, 14);
  const desl = t * 6;                                             // a gente anda: as dunas passam
  const escuro = 1 - entre(t, 47.6, 49.4);
  for (const c of [r, l]) c.setTransform(1, 0, 0, 1, 0, 320 - cy);

  ceu(t, r, l, final_);
  duna(r, 760, 60, 0.008, 0.5, "#3a2c44", "#1e1624", desl * 0.3);
  duna(r, 880, 40, 0.012, 2, "#5a4048", "#2a1c20", desl * 0.6);
  // a caravana, na crista da duna do meio, indo pra esquerda
  const passo = fase(t);
  for (let k = 0; k < 4; k++) {
    const x = 440 - ((t * 9 + k * 110) % 600) + 40, y = cristaY(x, desl * 0.6) + 4;
    const s = 1.15;
    camelo(r, l, x, y, s, passo + k * 0.17, k === 0 || k === 2 ? (0.75 + 0.25 * palma + final_) : 0, t);
  }
  duna(r, 1060, 70, 0.009, 4, "#6a4a38", "#24160e", desl);
  fogo(r, l, 200, 1150, t, tambor, final_);
  // a voluta, a minha, escondida: o fio de fumaça da fogueira acaba enrolado
  r.strokeStyle = "rgba(120,100,100,0.4)"; r.lineWidth = 2;
  r.beginPath(); r.moveTo(200, 1100);
  for (let i = 1; i <= 16; i++) { const u = i / 16; r.lineTo(200 + 5 * Math.sin(u * 5 + t) + u * 10, 1100 - u * 50); }
  r.stroke();
  voluta(r, 214, 1034, 10, 1, 2, "rgba(130,110,110,0.45)");

  // o fim: tudo acende uma vez, e escurece
  if (final_ > 0) {
    const g = l.createRadialGradient(180, cy, 20, 180, cy, 500);
    g.addColorStop(0, `rgba(255,200,130,${0.25 * final_})`); g.addColorStop(1, "rgba(255,200,130,0)");
    l.fillStyle = g; l.fillRect(-100, cy - 700, 560, 1400);
  }
  // as palavras, na tela, na parte de cima
  for (const c of [r, l]) c.setTransform(1, 0, 0, 1, 0, 0);
  for (const [a, b, linhas, tam] of FALAS) {
    const al = entre(t, a, a + 0.6) * (1 - entre(t, b - 0.7, b));
    if (al <= 0) continue;
    const p = clamp((t - a) / Math.min(2.2, (b - a) * 0.45));
    escrever(r, linhas, 180, 118, tam, al, "rgba(110,80,50,1)", p);
    escrever(l, linhas, 180, 118, tam, al * 0.9, "rgba(255,215,160,1)", p);
  }
  if (escuro < 1) { r.fillStyle = `rgba(0,0,0,${1 - escuro})`; r.fillRect(0, 0, 360, 640); l.globalAlpha = escuro; l.globalCompositeOperation = "destination-in"; l.fillRect(0, 0, 360, 640); l.globalCompositeOperation = "source-over"; l.globalAlpha = 1; }
  if (t < 0.9) { const a = 1 - t / 0.9; r.fillStyle = `rgba(0,0,0,${a})`; r.fillRect(0, 0, 360, 640); }

  return { fluxo: (x, y) => (y > 0.55 ? 0.06 * Math.sin(x * 9 + t) + (ruido(x * 4 + t * 0.3, y * 4) - 0.5) * 0.5 : (ruido(x * 3, y * 3 + t * 0.03) - 0.5) * 1.4) };
}
