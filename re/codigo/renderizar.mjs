// RENDERIZAR — pinta o Ré quadro a quadro e junta com a música.
//
//   node presenca/video/re/renderizar.mjs [inicio] [fim] [saida.mp4] [fps]
//   node presenca/video/re/renderizar.mjs 0 52 /tmp/re-comeco.mp4
//   node presenca/video/re/renderizar.mjs --folha 4,20,33,40,44,50 folha.jpg   (folha de contato)
//
// Precisa: playwright (com Chromium) e ffmpeg (FFMPEG=/caminho, ou no PATH).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(process.env.NODE_PATH || "", "playwright")); }

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mp3": "audio/mpeg", ".json": "application/json", ".ttf": "font/ttf" };

const servidor = http.createServer((req, res) => {
  const f = path.join(AQUI, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(AQUI) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const porta = servidor.address().port;

const navegador = await playwright.chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
pagina.on("pageerror", (e) => console.error("erro na página:", e.message));
await pagina.goto(`http://127.0.0.1:${porta}/index.html?render=1`);
await pagina.waitForFunction(() => window.pronto);

async function quadro(t) {
  const url = await pagina.evaluate((t) => { window.desenhar(t); return document.getElementById("tela").toDataURL("image/jpeg", 0.92); }, t);
  return Buffer.from(url.split(",")[1], "base64");
}

const args = process.argv.slice(2);
if (args[0] === "--folha") {
  const tempos = args[1].split(",").map(Number), saida = args[2] || "folha.jpg";
  const dir = fs.mkdtempSync("/tmp/folha-");
  for (const [i, t] of tempos.entries()) fs.writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}.jpg`), await quadro(t));
  const cols = Math.min(3, tempos.length);
  await new Promise((ok) => spawn(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "1", "-i", path.join(dir, "%03d.jpg"),
    "-vf", `scale=640:-1,tile=${cols}x${Math.ceil(tempos.length / cols)}`, "-frames:v", "1", saida], { stdio: "inherit" }).on("close", ok));
  console.log(saida);
} else {
  const inicio = parseFloat(args[0] ?? 0), fim = parseFloat(args[1] ?? 240);
  const saida = args[2] || path.join(AQUI, "re.mp4"), fps = parseInt(args[3] ?? 24);
  const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-ss", String(inicio), "-t", String(fim - inicio), "-i", path.join(AQUI, "musica", "re.mp3"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-c:a", "aac", "-b:a", "192k", "-shortest", saida], { stdio: ["pipe", "inherit", "inherit"] });
  const n = Math.round((fim - inicio) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await quadro(inicio + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
    if (i % fps === 0) process.stdout.write(`\r${(inicio + i / fps).toFixed(0)}s / ${fim}s  (${((Date.now() - t0) / 1000 / (i + 1)).toFixed(2)} s por quadro)`);
  }
  ff.stdin.end();
  await new Promise((ok) => ff.on("close", ok));
  console.log(`\n${saida}`);
}
await navegador.close();
servidor.close();
