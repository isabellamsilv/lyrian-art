// (cópia do pincel do Ré, em pé: 720×1280, pro celular)
// O PINCEL — o meu, menor.
//
// Aprendido com o Functional Emotions (MIT, ledbetterljoshua): a cena se
// pinta em duas camadas — um rascunho chapado e uma camada de luz — e as
// pinceladas repintam o rascunho, pegando a cor de baixo e seguindo as
// bordas ou um campo de fluxo. O código é outro, escrito aqui, em Canvas2D.
//
// O que é só meu: toda pincelada termina com um giro mínimo, uma voluta.
// Sempre pro mesmo lado. É a mão. Em todas as telas, em todas as escalas.
//
// Cada quadro é função pura do tempo t.

export const W = 720, H = 1280;
const RW = 360, RH = 640;          // o rascunho pinta em meia resolução
const SW = 180, SH = 320;          // e é lido em um quarto, pra amostrar cor

export function semente(a) {        // mulberry32
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruído suave — o campo de fluxo
const PERM = (() => {
  const r = semente(21), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  return p.concat(p);
})();
const fade = (t) => t * t * (3 - 2 * t);
function grade(ix, iy) { return PERM[(PERM[ix & 255] + iy) & 255] / 255; }
export function ruido(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = grade(ix, iy), b = grade(ix + 1, iy), c = grade(ix, iy + 1), d = grade(ix + 1, iy + 1);
  const u = fade(fx), v = fade(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function tela(w, h) {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
  return c;
}

export class Pincel {
  constructor(saida) {
    this.saida = saida;
    this.o = saida.getContext("2d");
    this.rasc = tela(RW, RH); this.r = this.rasc.getContext("2d");
    this.luz = tela(RW, RH); this.l = this.luz.getContext("2d");
    this.tinta = tela(RW, RH); this.k = this.tinta.getContext("2d");   // o que se escreve não se repinta
    this.amostra = tela(SW, SH); this.a = this.amostra.getContext("2d", { willReadFrequently: true });
    this.grao = this.fazerGrao();
  }

  fazerGrao() {
    const g = [], r = semente(7);
    for (let k = 0; k < 4; k++) {
      const c = tela(256, 256), x = c.getContext("2d"), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = 128 + (r() - 0.5) * 70;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0); g.push(c);
    }
    return g;
  }

  // cena(t, r, l) pinta o rascunho (r) e a luz (l) em 640×360.
  // opcoes.fluxo(x, y, t) -> ângulo, em coordenadas de 0..1
  quadro(t, cena, opcoes = {}) {
    const { r, l, a, o } = this;
    r.setTransform(1, 0, 0, 1, 0, 0); l.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = "source-over"; r.globalAlpha = 1;
    r.fillStyle = "#000"; r.fillRect(0, 0, RW, RH);
    l.globalCompositeOperation = "source-over"; l.globalAlpha = 1;
    l.clearRect(0, 0, RW, RH);
    const k = this.k; k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = 1; k.clearRect(0, 0, RW, RH);
    const info = cena(t, r, l, k) || {};

    a.drawImage(this.rasc, 0, 0, SW, SH);
    const px = a.getImageData(0, 0, SW, SH).data;

    // o chão: o rascunho desfocado, pra não sobrar buraco entre pinceladas
    o.globalCompositeOperation = "source-over"; o.globalAlpha = 1;
    o.filter = "blur(10px)";
    o.drawImage(this.rasc, 0, 0, W, H);
    o.filter = "none";

    const fluxo = info.fluxo || opcoes.fluxo || ((x, y, t) => ruido(x * 3 + t * 0.05, y * 3) * Math.PI * 2);
    const ferve = Math.floor(t * 6);                         // as pinceladas fervem 6×/s
    const respira = 1 + 0.25 * Math.sin((t / 8) * Math.PI * 2);
    const densidade = info.densidade ?? 1;
    this.camada(px, fluxo, t, 26, 11, 0.9, ferve * 3 + 1, respira, densidade);
    this.camada(px, fluxo, t, 13, 5.5, 0.85, ferve * 3 + 2, respira, densidade);
    this.camada(px, fluxo, t, 7, 2.6, 0.8, ferve * 3 + 3, respira, densidade, true);

    // a tinta: carvão sobre linho — multiplica, não repinta
    o.globalCompositeOperation = "multiply"; o.filter = "blur(0.7px)";
    o.drawImage(this.tinta, 0, 0, W, H);
    o.filter = "none"; o.globalCompositeOperation = "source-over";

    // a luz: soma, com um halo
    o.globalCompositeOperation = "lighter";
    o.filter = "blur(18px)"; o.globalAlpha = 0.9;
    o.drawImage(this.luz, 0, 0, W, H);
    o.filter = "blur(1px)"; o.globalAlpha = 1;
    o.drawImage(this.luz, 0, 0, W, H);
    o.filter = "none";

    // o acabamento: vinheta e grão de tela
    o.globalCompositeOperation = "source-over";
    const v = o.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.6)");
    o.fillStyle = v; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.16;
    const g = this.grao[ferve % 4];
    for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) o.drawImage(g, x, y);
    o.globalAlpha = 1; o.globalCompositeOperation = "source-over";
    return info;
  }

  camada(px, fluxo, t, passo, largura, alfa, sem, respira, densidade, fina = false) {
    const o = this.o, rnd = semente(sem * 7919 + passo);
    const cols = Math.ceil(W / passo) + 1, lins = Math.ceil(H / passo) + 1;
    o.lineCap = "round"; o.lineJoin = "round";
    for (let j = 0; j < lins; j++) {
      for (let i = 0; i < cols; i++) {
        if (densidade < 1 && rnd() > densidade) { rnd(); rnd(); rnd(); continue; }
        const x = (i + (rnd() - 0.5) * 0.9 * respira) * passo;
        const y = (j + (rnd() - 0.5) * 0.9 * respira) * passo;
        const sx = Math.min(SW - 2, Math.max(1, (x / W) * SW | 0));
        const sy = Math.min(SH - 2, Math.max(1, (y / H) * SH | 0));
        const k = (sy * SW + sx) * 4;
        let cr = px[k], cg = px[k + 1], cb = px[k + 2];
        const lum = cr + cg + cb;
        if (fina && lum < 30) { rnd(); continue; }      // o escuro não precisa de detalhe

        // a borda manda, se houver; senão, o fluxo
        const gx = (px[k + 4] + px[k + 5] + px[k + 6]) - (px[k - 4] + px[k - 3] + px[k - 2]);
        const gy = (px[k + SW * 4] + px[k + SW * 4 + 1] + px[k + SW * 4 + 2])
                 - (px[k - SW * 4] + px[k - SW * 4 + 1] + px[k - SW * 4 + 2]);
        const forca = Math.hypot(gx, gy);
        let ang = fluxo(x / W, y / H, t);
        if (forca > 40) {
          const borda = Math.atan2(gy, gx) + Math.PI / 2;
          const m = Math.min(1, (forca - 40) / 120);
          ang = Math.atan2(Math.sin(ang) * (1 - m) + Math.sin(borda) * m,
                           Math.cos(ang) * (1 - m) + Math.cos(borda) * m);
        }
        ang += (rnd() - 0.5) * 0.35;

        const var_ = 1 + (rnd() - 0.5) * 0.22;
        cr = Math.min(255, cr * var_); cg = Math.min(255, cg * var_); cb = Math.min(255, cb * var_);
        this.pincelada(o, x, y, ang, passo * 1.7, largura, `rgba(${cr | 0},${cg | 0},${cb | 0},${alfa})`);
      }
    }
  }

  // a pincelada com voluta: corre reta, e no fim gira sobre si, sempre à esquerda
  pincelada(o, x, y, ang, comp, larg, cor) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const x0 = x - c * comp * 0.5, y0 = y - s * comp * 0.5;
    const x1 = x + c * comp * 0.3, y1 = y + s * comp * 0.3;
    const g = ang - 1.9, rv = comp * 0.18;          // o giro
    const x2 = x1 + Math.cos(ang - 0.6) * rv * 1.4, y2 = y1 + Math.sin(ang - 0.6) * rv * 1.4;
    const x3 = x2 + Math.cos(g) * rv, y3 = y2 + Math.sin(g) * rv;
    o.strokeStyle = cor; o.lineWidth = larg;
    o.beginPath(); o.moveTo(x0, y0);
    o.quadraticCurveTo(x1, y1, x2, y2);
    o.quadraticCurveTo(x2 + Math.cos(ang - 1.2) * rv, y2 + Math.sin(ang - 1.2) * rv, x3, y3);
    o.stroke();
  }
}

// a voluta grande — a assinatura desenhada inteira, de 0 a p (0..1):
// uma haste que chega reta e se enrola pra dentro, sempre à esquerda.
export function voluta(ctx, cx, cy, raio, p, largura, cor) {
  const voltas = 1.55, a0 = Math.PI * 0.5;
  const esp = (v) => {
    const a = a0 - v * voltas * Math.PI * 2, r = raio * (1 - v * 0.85);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, a];
  };
  const [sx, sy, sa] = esp(0);
  const tx = Math.sin(sa), ty = -Math.cos(sa);          // tangente, no sentido do giro
  const hx = sx - tx * raio * 1.8, hy = sy - ty * raio * 1.8;
  ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(hx, hy);
  const ph = Math.min(1, p / 0.3);
  ctx.lineTo(hx + (sx - hx) * ph, hy + (sy - hy) * ph);
  if (p > 0.3) {
    const n = 80, ate = (p - 0.3) / 0.7;
    for (let i = 1; i <= Math.ceil(n * ate); i++) {
      const [x, y] = esp(Math.min(ate, i / n));
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}
