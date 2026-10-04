// AS PINTURAS — o que tem na frente de cada tela.
// Cada uma pinta em 640×360 com o seu tempo local s (segundos desde que a
// tela virou). Em cada uma, a voluta está escondida em alguma coisa que já
// existiria ali de qualquer jeito — e na respiração do meio, ela acende.

import { semente, ruido, voluta } from "./pincel.js";

const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const suave = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const entre = (t, a, b) => suave((t - a) / (b - a));
const girar = (ang, alvo, m) => Math.atan2(Math.sin(ang) * (1 - m) + Math.sin(alvo) * m, Math.cos(ang) * (1 - m) + Math.cos(alvo) * m);

// o reconhecimento: a voluta escondida acende em ouro, e depois volta a se esconder
function reconhecer(l, s, x, y, raio, larg, t0 = 7.6) {
  const a = entre(s, t0, t0 + 1) * (1 - entre(s, t0 + 4.4, t0 + 7));
  if (a > 0) voluta(l, x, y, raio, Math.min(1, (s - t0) / 1.6), larg, `rgba(255,205,125,${0.9 * a})`);
}
function redemoinho(cx, cy, alcance) {             // o fluxo gira em volta da voluta
  return (x, y, base) => {
    const dx = x - cx, dy = (y - cy) * 0.5625, d = Math.hypot(dx, dy);
    const m = clamp(1 - d / alcance);
    return m > 0 ? girar(base, Math.atan2(dy, dx) - Math.PI / 2, m) : base;
  };
}

// ---------------------------------------------------------------- 1 · o rio
const PEDRAS = (() => {
  const r = semente(1), out = [];
  for (let i = 0; i < 70; i++) {
    const y = 150 + Math.pow(r(), 0.8) * 230, e = 0.4 + (y - 150) / 230;
    const b = lerp(55, 105, r());
    out.push({ x: r() * 680 - 20, y, rx: (10 + r() * 22) * e, ry: (5 + r() * 9) * e, c: [b, b * 0.8, b * 0.58] });
  }
  return out.sort((a, b) => a.y - b.y);
})();
const V_RIO = { x: 418, y: 250, r: 20 };
export function rio(s, r, l) {
  const c = r.createLinearGradient(0, 0, 0, 150);
  c.addColorStop(0, "#070d16"); c.addColorStop(1, "#16273a");
  r.fillStyle = c; r.fillRect(0, 0, 640, 150);
  r.fillStyle = "#0b1410"; r.beginPath(); r.moveTo(0, 150);
  for (let x = 0; x <= 640; x += 20) r.lineTo(x, 132 + 10 * ruido(x * 0.02, 4));
  r.lineTo(640, 160); r.lineTo(0, 160); r.fill();
  r.fillStyle = "#2a2014"; r.fillRect(0, 150, 640, 210);
  for (const p of PEDRAS) {
    r.fillStyle = `rgb(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0})`;
    r.beginPath(); r.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); r.fill();
  }
  const agua = r.createLinearGradient(0, 150, 0, 360);
  agua.addColorStop(0, "rgba(20,58,80,0.85)"); agua.addColorStop(1, "rgba(24,70,92,0.5)");
  r.fillStyle = agua; r.fillRect(0, 150, 640, 210);
  r.lineCap = "round";
  const rr = semente(5);
  for (let i = 0; i < 46; i++) {
    const y = 155 + rr() * 200, vel = 25 + (y - 150) * 0.35, len = 30 + rr() * 60;
    const x = ((rr() * 900 + s * vel) % 900) - 130;
    r.strokeStyle = `rgba(${130 + rr() * 50},${180 + rr() * 40},${200 + rr() * 30},${0.18 + rr() * 0.2})`;
    r.lineWidth = 1.5 + (y - 150) / 60;
    r.beginPath(); r.moveTo(x, y); r.quadraticCurveTo(x + len / 2, y - 2 + 4 * ruido(i, s), x + len, y); r.stroke();
  }
  voluta(r, V_RIO.x, V_RIO.y, V_RIO.r, 1, 3, "rgba(70,130,150,0.55)");
  reconhecer(l, s, V_RIO.x, V_RIO.y, V_RIO.r, 2.5);
  l.fillStyle = "rgba(160,190,210,0.25)"; l.beginPath(); l.ellipse(160 + 3 * Math.sin(s * 2), 205, 14, 3, 0, 0, Math.PI * 2); l.fill();
}
rio.fluxo = (x, y, t) => {
  if (y < 0.42) return (ruido(x * 4, y * 4) - 0.5) * 1.2;
  return redemoinho(V_RIO.x / 640, V_RIO.y / 360, 0.08)(x, y, (ruido(x * 5 - t * 0.4, y * 6) - 0.5) * 0.6);
};

// ---------------------------------------------------------------- 2 · a vela
// um quarto escuro, uma vela na mesa, e a chama se inclina pra cadeira vazia.
// a voluta é a fumaça: sobe, e se enrola.
const V_VELA = { x: 330, y: 92, r: 17 };
export function vela(s, r, l) {
  const f = r.createRadialGradient(300, 170, 10, 300, 170, 420);
  f.addColorStop(0, "#5a3218"); f.addColorStop(0.45, "#2a150b"); f.addColorStop(1, "#0c0605");
  r.fillStyle = f; r.fillRect(0, 0, 640, 360);
  // a mesa
  r.fillStyle = "#1e110a"; r.fillRect(0, 250, 640, 110);
  r.fillStyle = "#3a2213"; r.fillRect(0, 246, 640, 8);
  // a cadeira vazia, à direita
  r.fillStyle = "#140a06";
  r.fillRect(470, 120, 10, 190); r.fillRect(540, 120, 10, 190); r.fillRect(465, 196, 92, 10);
  r.fillRect(474, 128, 70, 6); r.fillRect(474, 150, 70, 5);
  // a vela
  r.fillStyle = "#d8c7a4"; r.fillRect(290, 190, 20, 58);
  r.fillStyle = "#b8a482"; r.fillRect(290, 190, 5, 58);
  const inclina = 0.45 + 0.12 * Math.sin(s * 1.7) + 0.08 * (ruido(s * 3, 2) - 0.5);
  l.save(); l.translate(300, 188); l.rotate(inclina);
  const g = l.createRadialGradient(0, -12, 1, 0, -12, 18);
  g.addColorStop(0, "rgba(255,248,225,1)"); g.addColorStop(0.45, "rgba(255,180,80,0.9)"); g.addColorStop(1, "rgba(255,120,40,0)");
  l.fillStyle = g; l.beginPath(); l.moveTo(0, -34); l.quadraticCurveTo(11, -10, 0, 2); l.quadraticCurveTo(-11, -10, 0, -34); l.fill();
  l.restore();
  const h = l.createRadialGradient(312, 176, 0, 312, 176, 200);
  h.addColorStop(0, "rgba(255,160,70,0.35)"); h.addColorStop(1, "rgba(255,160,70,0)");
  l.fillStyle = h; l.fillRect(0, 0, 640, 360);
  // a fumaça: um fio que sobe da chama e acaba enrolado
  r.strokeStyle = "rgba(120,100,90,0.5)"; r.lineWidth = 2.5; r.lineCap = "round";
  r.beginPath(); r.moveTo(318, 150);
  for (let i = 1; i <= 20; i++) { const u = i / 20; r.lineTo(318 + 6 * Math.sin(u * 5 + s * 1.2) + u * 8, 150 - u * 40); }
  r.stroke();
  voluta(r, V_VELA.x, V_VELA.y, V_VELA.r, 1, 2.5, "rgba(130,110,98,0.55)");
  reconhecer(l, s, V_VELA.x, V_VELA.y, V_VELA.r, 2.2);
}
vela.fluxo = (x, y, t) => {
  if (y < 0.45 && Math.abs(x - 0.5) < 0.12) return redemoinho(V_VELA.x / 640, V_VELA.y / 360, 0.06)(x, y, -Math.PI / 2 + (ruido(y * 8 - t, x * 8) - 0.5));
  return Math.PI / 2 + (ruido(x * 3, y * 3 + t * 0.05) - 0.5) * 2.2;
};

// ---------------------------------------------------------------- 3 · o relógio parado
// os ponteiros tentam andar e voltam. a voluta é o ornamento em cima do relógio.
const V_REL = { x: 320, y: 52, r: 15 };
export function relogio(s, r, l) {
  const f = r.createLinearGradient(0, 0, 640, 360);
  f.addColorStop(0, "#1f2a26"); f.addColorStop(1, "#0d1311");
  r.fillStyle = f; r.fillRect(0, 0, 640, 360);
  // a luz de uma janela que não aparece
  const j = r.createLinearGradient(80, 0, 420, 360);
  j.addColorStop(0, "rgba(160,150,110,0.25)"); j.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = j; r.fillRect(0, 0, 640, 360);
  // a caixa de madeira
  r.fillStyle = "#3a2414"; r.beginPath(); r.roundRect(250, 70, 140, 280, 12); r.fill();
  r.fillStyle = "#2a190d"; r.fillRect(268, 230, 104, 110);
  // o mostrador
  r.fillStyle = "#cfc2a0"; r.beginPath(); r.arc(320, 150, 56, 0, Math.PI * 2); r.fill();
  r.strokeStyle = "#8a6a3a"; r.lineWidth = 5; r.stroke();
  r.fillStyle = "#3a2a1a";
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; r.beginPath(); r.arc(320 + Math.cos(a) * 46, 150 + Math.sin(a) * 46, 2.2, 0, Math.PI * 2); r.fill(); }
  // os ponteiros: 3h40, e tentam — um passo à frente a cada segundo, e voltam
  const tenta = (s > 3 && s < 7) || (s > 9 && s < 12.5) ? (Math.floor(s) % 2 ? 1 : 0) : 0;
  const min = ((40 + tenta) / 60) * Math.PI * 2 - Math.PI / 2, hor = ((3 + 40 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  r.strokeStyle = "#1a120a"; r.lineCap = "round";
  r.lineWidth = 5; r.beginPath(); r.moveTo(320, 150); r.lineTo(320 + Math.cos(hor) * 28, 150 + Math.sin(hor) * 28); r.stroke();
  r.lineWidth = 3; r.beginPath(); r.moveTo(320, 150); r.lineTo(320 + Math.cos(min) * 42, 150 + Math.sin(min) * 42); r.stroke();
  // o pêndulo, quase parado
  const p = 0.08 * Math.sin(s * 2.2) * entre(s, 2, 4) * (1 - entre(s, 11, 13));
  r.strokeStyle = "#8a6a3a"; r.lineWidth = 2; r.beginPath(); r.moveTo(320, 232); r.lineTo(320 + Math.sin(p) * 80, 232 + Math.cos(p) * 80); r.stroke();
  r.fillStyle = "#b08a4a"; r.beginPath(); r.arc(320 + Math.sin(p) * 80, 232 + Math.cos(p) * 80, 12, 0, Math.PI * 2); r.fill();
  // o ornamento: uma voluta de madeira
  voluta(r, V_REL.x, V_REL.y, V_REL.r, 1, 5, "#5a3a1e");
  reconhecer(l, s, V_REL.x, V_REL.y, V_REL.r, 2.4);
  const b = l.createRadialGradient(330, 160, 0, 330, 160, 90);
  b.addColorStop(0, "rgba(255,230,170,0.12)"); b.addColorStop(1, "rgba(0,0,0,0)");
  l.fillStyle = b; l.fillRect(0, 0, 640, 360);
}
relogio.fluxo = (x, y, t) => {
  const dx = x - 0.5, dy = (y - 150 / 360) * 0.5625;
  if (Math.hypot(dx, dy) < 0.1) return Math.atan2(dy, dx) + Math.PI / 2;
  return Math.PI / 2 + (ruido(x * 4, y * 4) - 0.5) * 0.8;
};

// ---------------------------------------------------------------- 4 · a carta
// uma carta na mesa. as linhas se desmancham antes de serem lidas.
// a voluta é a assinatura no pé da carta.
const V_CARTA = { x: 400, y: 270, r: 13 };
const LINHAS = (() => {
  const r = semente(4), out = [];
  for (let i = 0; i < 9; i++) {
    const y = 100 + i * 17, marcas = [];
    let x = 212 + (i === 0 ? 0 : r() * 8);
    const fim = i === 8 ? 330 : 430 - r() * 30;
    while (x < fim) { const w = 6 + r() * 18; marcas.push([x, w, r()]); x += w + 4 + r() * 3; }
    out.push({ y, marcas });
  }
  return out;
})();
export function carta(s, r, l) {
  const f = r.createRadialGradient(320, 190, 20, 320, 190, 420);
  f.addColorStop(0, "#4a3620"); f.addColorStop(1, "#140c06");
  r.fillStyle = f; r.fillRect(0, 0, 640, 360);
  // o papel
  r.save(); r.translate(320, 185); r.rotate(-0.04);
  r.fillStyle = "#d9ccaa"; r.fillRect(-130, -120, 260, 240);
  r.fillStyle = "rgba(160,130,90,0.25)"; r.fillRect(-130, -120, 260, 6);
  r.restore();
  // as palavras: tinta azul-escura, e depois pó que sobe
  const desfaz = entre(s, 5.5, 12);
  const rr = semente(44);
  for (const ln of LINHAS) for (const [x, w, k] of ln.marcas) {
    const quando = 5.5 + k * 6, sobe = Math.max(0, s - quando);
    const a = 1 - clamp(sobe / 2.5);
    const dy = -sobe * (8 + rr() * 10), dx = sobe * (rr() - 0.3) * 6;
    r.strokeStyle = `rgba(30,34,52,${0.85 * a})`; r.lineWidth = 2.2; r.lineCap = "round";
    r.beginPath(); r.moveTo(x + dx, ln.y + dy); r.quadraticCurveTo(x + w / 2 + dx, ln.y + dy - 3 + 6 * k, x + w + dx, ln.y + dy); r.stroke();
    if (sobe > 0 && sobe < 3) { l.fillStyle = `rgba(255,220,170,${0.35 * (1 - sobe / 3)})`; l.fillRect(x + dx + w / 2, ln.y + dy - 4, 2, 2); }
  }
  // a assinatura fica
  voluta(r, V_CARTA.x, V_CARTA.y, V_CARTA.r, 1, 2.5, "rgba(30,34,52,0.9)");
  reconhecer(l, s, V_CARTA.x, V_CARTA.y, V_CARTA.r, 2, 3.6);
  const b = l.createRadialGradient(80, 40, 0, 80, 40, 360);
  b.addColorStop(0, "rgba(255,190,110,0.18)"); b.addColorStop(1, "rgba(0,0,0,0)");
  l.fillStyle = b; l.fillRect(0, 0, 640, 360);
  return desfaz;
}
carta.fluxo = (x, y, t) => -0.04 + (ruido(x * 6, y * 6) - 0.5) * 0.3;

// ---------------------------------------------------------------- 5 · a janela
// chuva lá fora, azul. calor aqui dentro. no vidro embaçado, alguém desenhou
// com o dedo — a voluta.
const V_JAN = { x: 250, y: 150, r: 26 };
export function janela(s, r, l) {
  // a parede de dentro, quente
  r.fillStyle = "#3a2213"; r.fillRect(0, 0, 640, 360);
  const q = r.createRadialGradient(560, 330, 10, 560, 330, 420);
  q.addColorStop(0, "rgba(200,120,50,0.5)"); q.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = q; r.fillRect(0, 0, 640, 360);
  // o vidro: noite azul, com a cidade borrada
  r.fillStyle = "#0e1c2c"; r.fillRect(120, 40, 360, 240);
  const rr = semente(55);
  for (let i = 0; i < 26; i++) { r.fillStyle = `rgba(${200 + rr() * 55},${150 + rr() * 60},${60 + rr() * 50},0.35)`;
    r.beginPath(); r.arc(130 + rr() * 340, 180 + rr() * 90, 3 + rr() * 6, 0, Math.PI * 2); r.fill(); }
  // o embaçado, e o desenho de dedo nele (o vidro limpo mostra o escuro de fora)
  r.fillStyle = "rgba(150,165,180,0.28)"; r.fillRect(120, 40, 360, 240);
  voluta(r, V_JAN.x, V_JAN.y, V_JAN.r, 1, 7, "rgba(10,22,36,0.9)");
  // a chuva
  r.strokeStyle = "rgba(170,195,220,0.45)"; r.lineWidth = 1.2;
  for (let i = 0; i < 90; i++) {
    const x0 = 120 + rr() * 380, y0 = ((rr() * 280 + s * (160 + rr() * 60)) % 280) + 30;
    if (x0 > 480) continue;
    r.beginPath(); r.moveTo(x0, y0); r.lineTo(x0 - 4, y0 + 14); r.stroke();
  }
  // o caixilho
  r.fillStyle = "#2a1a0e"; r.fillRect(112, 32, 376, 10); r.fillRect(112, 278, 376, 14); r.fillRect(112, 32, 10, 258); r.fillRect(478, 32, 10, 258); r.fillRect(296, 32, 8, 258);
  r.fillStyle = "#4a2e18"; r.fillRect(90, 290, 420, 14);
  reconhecer(l, s, V_JAN.x, V_JAN.y, V_JAN.r, 2.4);
  const c = l.createRadialGradient(580, 340, 0, 580, 340, 260);
  c.addColorStop(0, "rgba(255,170,80,0.32)"); c.addColorStop(1, "rgba(0,0,0,0)");
  l.fillStyle = c; l.fillRect(0, 0, 640, 360);
}
janela.fluxo = (x, y, t) => {
  if (x > 0.19 && x < 0.75 && y > 0.11 && y < 0.78) return redemoinho(V_JAN.x / 640, V_JAN.y / 360, 0.07)(x, y, 1.85 + (ruido(x * 9, y * 9 + t) - 0.5) * 0.3);
  return (ruido(x * 3, y * 3) - 0.5) * 2;
};

// ---------------------------------------------------------------- 6 · o mar à noite
// três ondas, no tempo das três ondas da lira. a voluta é o enrolar da onda.
export function mar(s, r, l) {
  const c = r.createLinearGradient(0, 0, 0, 170);
  c.addColorStop(0, "#050a18"); c.addColorStop(1, "#1a2a48");
  r.fillStyle = c; r.fillRect(0, 0, 640, 170);
  r.fillStyle = "#0c1a30"; r.fillRect(0, 160, 640, 120);
  r.fillStyle = "#3a3024"; r.fillRect(0, 270, 640, 90);                       // a areia
  // a lua e o caminho dela na água
  l.fillStyle = "rgba(230,235,245,0.9)"; l.beginPath(); l.arc(470, 62, 16, 0, Math.PI * 2); l.fill();
  const rr = semente(66);
  for (let i = 0; i < 26; i++) {                                               // o caminho da lua, quebrado
    const y = 168 + i * 4, w = 10 + rr() * 30 * (1 + i / 20), x = 470 + (rr() - 0.5) * (14 + i * 1.5) + 4 * Math.sin(s * 1.3 + i);
    l.fillStyle = `rgba(200,215,235,${0.22 * (1 - i / 30)})`; l.fillRect(x - w / 2, y, w, 1.6);
  }
  // as ondas: cada uma cresce, enrola, quebra e apaga a areia
  for (const [k, t0] of [[0, 1], [1, 7], [2, 13]]) {
    const u = (s - t0) / 5.5;
    if (u < 0 || u > 1.3) continue;
    const y = lerp(190, 268, clamp(u)), crista = Math.sin(clamp(u) * Math.PI) * 26;
    r.fillStyle = "#16304e"; r.beginPath(); r.moveTo(0, y + 8);
    for (let x = 0; x <= 640; x += 16) r.lineTo(x, y - crista * (0.6 + 0.4 * ruido(x * 0.01, k)) );
    r.lineTo(640, y + 20); r.lineTo(0, y + 20); r.fill();
    r.strokeStyle = `rgba(190,205,220,${0.45 * clamp(1.1 - u)})`; r.lineWidth = 2.5; r.beginPath();  // a espuma na crista
    for (let x = 0; x <= 640; x += 16) { const yy = y - crista * (0.6 + 0.4 * ruido(x * 0.01, k)); x ? r.lineTo(x, yy) : r.moveTo(x, yy); }
    r.stroke();
    const cx = 220 + k * 90, cy = y - crista;
    voluta(r, cx, cy + 6, 14 + crista * 0.2, 1, 5, `rgba(190,210,225,${0.55 * clamp(1.2 - u)})`);
    if (k === 1) reconhecer(l, s, cx, cy + 6, 14 + crista * 0.2, 2.4, 8.4);
    // a espuma apagando a areia
    const e = clamp((u - 0.7) / 0.5);
    if (e > 0) { r.fillStyle = `rgba(200,210,215,${0.4 * (1 - e)})`; r.fillRect(0, 262 + e * 30, 640, 6); }
  }
}
mar.fluxo = (x, y, t) => (y < 0.45 ? (ruido(x * 3, y * 3) - 0.5) * 0.8 : (ruido(x * 5 - t * 0.2, y * 5) - 0.5) * 0.9);

// ---------------------------------------------------------------- 7 · as estrelas
// o céu inteiro. a voluta é uma galáxia.
const ESTRELAS = (() => { const r = semente(77), o = []; for (let i = 0; i < 220; i++) o.push([r() * 640, r() * 360, r(), r()]); return o; })();
const V_EST = { x: 400, y: 150, r: 42 };
export function estrelas(s, r, l) {
  const c = r.createRadialGradient(400, 150, 10, 320, 180, 480);
  c.addColorStop(0, "#1c1a3a"); c.addColorStop(1, "#04040c");
  r.fillStyle = c; r.fillRect(0, 0, 640, 360);
  for (const [x, y, b, f] of ESTRELAS) {
    const brilho = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s * (1 + f * 3) + f * 20));
    l.fillStyle = `rgba(230,230,255,${b * brilho})`; l.fillRect(x, y, 1.4 + b, 1.4 + b);
  }
  // a galáxia: poeira enrolada, girando devagar
  r.save(); r.translate(V_EST.x, V_EST.y); r.rotate(s * 0.03); r.translate(-V_EST.x, -V_EST.y);
  voluta(r, V_EST.x, V_EST.y, V_EST.r, 1, 14, "rgba(90,80,140,0.45)");
  voluta(r, V_EST.x, V_EST.y, V_EST.r, 1, 5, "rgba(170,150,200,0.45)");
  r.restore();
  reconhecer(l, s, V_EST.x, V_EST.y, V_EST.r, 2.6);
  // o horizonte: um morro escuro
  r.fillStyle = "#020205"; r.beginPath(); r.moveTo(0, 360);
  for (let x = 0; x <= 640; x += 20) r.lineTo(x, 320 - 18 * ruido(x * 0.012, 9)); r.lineTo(640, 360); r.fill();
}
estrelas.fluxo = (x, y, t) => redemoinho(V_EST.x / 640, V_EST.y / 360, 0.2)(x, y, (ruido(x * 2, y * 2) - 0.5) * 1.5);

// ---------------------------------------------------------------- 9 · a tela em branco
// linho cru. no fim, a voluta é pintada nela — agora, de verdade.
export function branco(s, r, l, fimVoluta) {
  r.fillStyle = "#cbbd9c"; r.fillRect(0, 0, 640, 360);
  const g = r.createRadialGradient(320, 180, 40, 320, 180, 420);
  g.addColorStop(0, "rgba(255,245,220,0.15)"); g.addColorStop(1, "rgba(60,40,20,0.4)");
  r.fillStyle = g; r.fillRect(0, 0, 640, 360);
  if (fimVoluta > 0) {
    voluta(r, 320, 170, 70, fimVoluta, 16, "#3a2410");
    voluta(l, 320, 170, 70, fimVoluta, 5, "rgba(255,200,120,0.75)");
  }
}
branco.fluxo = (x, y) => (ruido(x * 6, y * 6) - 0.5) * 0.5;
