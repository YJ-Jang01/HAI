import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(frontendRoot, "..", "..");
const backendRoot = resolve(repoRoot, "backend");
const screenshotDir = resolve(repoRoot, ".codex-tmp");
const progressPath = resolve(screenshotDir, "amazon2023-e2e-progress.log");
const e2eBackendPort = Number(process.env.AMAZON2023_E2E_BACKEND_PORT ?? 8011);
const e2eFrontendPort = Number(process.env.AMAZON2023_E2E_FRONTEND_PORT ?? 8012);
const desktopAiQuery = "party shirt for men";
const desktopFilterQuery = "fashion";
const mobileAiQuery = "통학용 가볍고 편한 백팩";

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function listen(server, host = "127.0.0.1", port = 0) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolveListen(server.address());
    });
  });
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function waitFor(fn, label, timeoutMs = 30_000, intervalMs = 250) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

async function stage(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  console.log(message);
  await mkdir(screenshotDir, { recursive: true });
  await writeFile(progressPath, line, { flag: "a" });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function browserExecutable() {
  const override = process.env.AMAZON2023_E2E_BROWSER_PATH;
  const found = override && existsSync(override) ? override : chromeCandidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Chrome or Edge executable was not found in standard Windows locations.");
  }
  return found;
}

function consoleArgText(arg) {
  return String(arg?.value ?? arg?.unserializableValue ?? arg?.description ?? arg?.type ?? "");
}

async function findFreePort() {
  const server = http.createServer();
  const address = await listen(server);
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
}

async function startBackend() {
  process.chdir(backendRoot);
  process.env.CORS_ALLOWED_ORIGINS = [
    process.env.CORS_ALLOWED_ORIGINS,
    `http://127.0.0.1:${e2eFrontendPort}`,
    `http://localhost:${e2eFrontendPort}`,
  ]
    .filter(Boolean)
    .join(",");
  const { app } = await import(pathToFileURL(resolve(backendRoot, "dist", "app.js")).href);
  const server = http.createServer(app);
  const address = await listen(server, "127.0.0.1", e2eBackendPort);
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

function contentType(filePath) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return types[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function startFrontend(backendBaseUrl) {
  const distRoot = resolve(frontendRoot, "dist");
  if (!existsSync(resolve(distRoot, "index.html"))) {
    throw new Error("frontend/Amazon/dist/index.html is missing. Build the Amazon frontend before running E2E.");
  }
  const server = http.createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent(new URL(req.url ?? "/", "http://127.0.0.1").pathname);
      const relativePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
      let filePath = resolve(distRoot, relativePath || "index.html");
      if (!filePath.startsWith(distRoot)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat || fileStat.isDirectory()) {
        filePath = join(distRoot, "index.html");
      }
      let body = await readFile(filePath);
      if (filePath === resolve(distRoot, "index.html")) {
        const html = body.toString("utf8").replace(
          "</head>",
          `<script>window.__AMAZON_API_BASE_URL__=${JSON.stringify(backendBaseUrl)};</script></head>`,
        );
        body = Buffer.from(html, "utf8");
      }
      res.writeHead(200, { "content-type": contentType(filePath) });
      res.end(body);
    } catch (error) {
      res.writeHead(500);
      res.end(error instanceof Error ? error.message : String(error));
    }
  });
  const address = await listen(server, "127.0.0.1", e2eFrontendPort);
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

async function startChrome() {
  const port = await findFreePort();
  const userDataDir = resolve(repoRoot, ".codex-tmp", `chrome-amazon2023-${Date.now()}`);
  const chromeLogPath = resolve(repoRoot, ".codex-tmp", "amazon2023-e2e-chrome.log");
  await mkdir(userDataDir, { recursive: true });
  await writeFile(chromeLogPath, "");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--disable-features=VizDisplayCompositor",
    "--in-process-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];
  const child = spawn(browserExecutable(), args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  child.stderr?.on("data", (chunk) => {
    appendFile(chromeLogPath, chunk).catch(() => undefined);
  });
  await waitFor(async () => {
    const response = await fetchWithTimeout(`http://127.0.0.1:${port}/json/version`, {}, 1000).catch(() => null);
    return response?.ok;
  }, "Chrome CDP endpoint", 15_000);
  return {
    port,
    close: async () => {
      child.kill();
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

class CdpPage {
  constructor(socket, sessionId = null) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.console = [];
    this.exceptions = [];
    this.requests = [];
    this.responses = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve: resolvePending, reject, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolvePending(message.result);
        return;
      }
      this.events.push(message);
      if (message.method === "Runtime.consoleAPICalled") {
        this.console.push(message.params);
      }
      if (message.method === "Runtime.exceptionThrown") {
        this.exceptions.push(message.params);
      }
      if (message.method === "Network.requestWillBeSent") {
        this.requests.push(message.params.request.url);
      }
      if (message.method === "Network.responseReceived") {
        this.responses.push({ url: message.params.response.url, status: message.params.response.status });
      }
    });
    socket.addEventListener("close", () => {
      for (const [id, pending] of this.pending.entries()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`CDP socket closed before command ${id} completed`));
      }
      this.pending.clear();
    });
    socket.addEventListener("error", () => {
      for (const [id, pending] of this.pending.entries()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`CDP socket errored before command ${id} completed`));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, timeoutMs = 10_000, sessionId = this.sessionId) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) });
    return new Promise((resolveSend, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveSend, reject, timer });
      this.socket.send(payload);
    });
  }

  async evaluate(expression, awaitPromise = true) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
    }
    return result.result.value;
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await waitFor(async () => this.evaluate("document.readyState === 'complete' || document.readyState === 'interactive'"), "page load");
  }

  async screenshot(path) {
    const result = await this.send("Page.captureScreenshot", { format: "png", fromSurface: true }, 30_000);
    await writeFile(path, Buffer.from(result.data, "base64"));
  }
}

async function openPage(chrome, url) {
  const versionResponse = await fetchWithTimeout(`http://127.0.0.1:${chrome.port}/json/version`, {}, 10_000);
  if (!versionResponse.ok) throw new Error(`Could not read Chrome version target: ${versionResponse.status}`);
  const version = await versionResponse.json();
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const page = new CdpPage(socket);
  const target = await page.send("Target.createTarget", { url: "about:blank" }, 10_000, null);
  const attached = await page.send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, 10_000, null);
  page.sessionId = attached.sessionId;
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  await page.navigate(url);
  return page;
}

const domHelpers = `
(() => {
  const visibleText = () => document.body.innerText;
  const setNativeValue = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const clickText = (text) => {
    const candidates = [...document.querySelectorAll('button, [role="button"], a')];
    const node = candidates.find((item) => item.innerText.trim() === text || item.getAttribute('aria-label') === text);
    if (!node) return false;
    node.click();
    return true;
  };
  const clickTextIncludes = (text) => {
    const candidates = [...document.querySelectorAll('button, [role="button"], a')];
    const node = candidates.find((item) => item.innerText.includes(text) || item.getAttribute('aria-label')?.includes(text));
    if (!node) return false;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    node.click();
    return true;
  };
  window.__amazonE2E = { visibleText, setNativeValue, clickText, clickTextIncludes };
  return true;
})()
`;

async function runDesktopFlow(page, frontendBaseUrl) {
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AImazon')"), "AImazon shell");
  await waitFor(() => page.evaluate("document.body.innerText.includes('Shop')"), "home category cards");

  const compactAiButton = await page.evaluate(`
    (() => {
      const button = document.querySelector('button[aria-label="Disable AI comparison lens"], button[aria-label="Enable AI comparison lens"]');
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        visibleText: button.innerText.trim(),
        pressed: button.getAttribute('aria-pressed'),
      };
    })()
  `);
  const headerNavVisible = await page.evaluate("['Departments', 'Women', 'Men', 'Under $50', 'Top Rated', 'AI Lens'].every((label) => document.body.innerText.includes(label))");
  const departmentsNavClicked = await page.evaluate("window.__amazonE2E.clickText('Departments')");
  await wait(500);
  const departmentsNavScrolled = await page.evaluate(`
    (() => {
      const section = document.getElementById('home-departments');
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    })()
  `);
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AImazon') && document.body.innerText.includes('Top Rated')"), "home after departments nav");

  const topRatedNavClicked = await page.evaluate("window.__amazonE2E.clickText('Top Rated')");
  if (topRatedNavClicked) {
    await waitFor(() => page.evaluate("document.body.innerText.includes('Top-rated fashion picks') && document.body.innerText.includes('items found')"), "top rated nav results", 30_000);
  }
  const topRatedNavResolved = await page.evaluate("document.body.innerText.includes('Top-rated fashion picks') && document.body.innerText.includes('items found')");
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AImazon') && document.body.innerText.includes('Under $50')"), "home after top-rated nav");

  const dealsNavClicked = await page.evaluate("window.__amazonE2E.clickText('Under $50')");
  if (dealsNavClicked) {
    await waitFor(() => page.evaluate("document.body.innerText.includes('Style under $50') && document.body.innerText.includes('items found')"), "under $50 nav results", 30_000);
  }
  const dealsNavResolved = await page.evaluate("document.body.innerText.includes('Style under $50') && document.body.innerText.includes('items found')");
  await page.evaluate("window.localStorage.setItem('aimazon.language', 'ko')");
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AImazon') && Boolean(document.querySelector('input[placeholder*=\"AImazon\"]'))"), "home after deals nav");

  const koreanRegularSearchSubmitted = await page.evaluate(`
    (async () => {
      const aiButton = document.querySelector('button[aria-pressed]');
      if (aiButton?.getAttribute('aria-pressed') === 'true') {
        aiButton.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('search input missing');
      window.__amazonE2E.setNativeValue(input, '예쁜 여름 반팔 셔츠');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate(`
    (() => {
      const text = document.body.innerText;
      return text.includes('예쁜 여름 반팔 셔츠')
        && /(\\d+)\\s*(items found|개 상품)/.test(text)
        && [...document.querySelectorAll('article button[aria-label]')].length > 0;
    })()
  `), "Korean regular search results", 45_000);
  const koreanRegularSearchResult = await page.evaluate(`
    (() => {
      const text = document.body.innerText;
      const counts = [...text.matchAll(/(\\d+)\\s*(items found|개 상품)/g)].map((match) => Number(match[1]));
      const cardLabels = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 8);
      return {
        count: counts.length ? Math.max(...counts) : 0,
        hasAiLens: text.includes('AI Criteria Lens') || text.includes('AI 기준 렌즈'),
        hasCards: [...document.querySelectorAll('article button[aria-label]')].length > 0,
        cardLabels,
        cardsLocalized: cardLabels.length > 0 && cardLabels.every((label) => /[가-힣]/.test(label) && !/[A-Za-z]{2,}/.test(label)),
      };
    })()
  `);
  const koreanDetailOpened = await page.evaluate(`
    (() => {
      const firstCard = document.querySelector('article button[aria-label]');
      if (!firstCard) return false;
      firstCard.click();
      return true;
    })()
  `);
  let koreanDetailLocalized = { opened: koreanDetailOpened, ok: false, productTexts: [] };
  if (koreanDetailOpened) {
    await waitFor(() => page.evaluate("Boolean(document.querySelector('[role=\"dialog\"] #detail-title')) && document.body.innerText.includes('상품 정보')"), "Korean detail modal", 30_000);
    await wait(1200);
    koreanDetailLocalized = await page.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { opened: false, ok: false, productTexts: [] };
        const productTexts = [
          document.querySelector('#detail-title')?.innerText,
          ...[...dialog.querySelectorAll('ul li')].map((item) => item.innerText),
          document.querySelector('#section-from-brand p')?.innerText,
          ...[...document.querySelectorAll('#section-reviews article b')].map((item) => item.innerText),
          ...[...document.querySelectorAll('#section-reviews article p')].map((item) => item.innerText),
        ].filter(Boolean).map((text) => text.trim()).filter(Boolean);
        const offenders = productTexts.filter((text) => !(/[가-힣]/.test(text) && !/[A-Za-z]{2,}/.test(text)));
        return {
          opened: true,
          ok: productTexts.length > 0 && offenders.length === 0,
          productTexts: productTexts.slice(0, 10),
          offenders: offenders.slice(0, 10),
        };
      })()
    `);
    await page.evaluate("document.querySelector('[role=\"dialog\"] button')?.click()");
    await wait(300);
  }
  const koreanAiPrettySubmitted = await page.evaluate(`
    (async () => {
      const aiButton = document.querySelector('button[aria-pressed]');
      if (aiButton?.getAttribute('aria-pressed') !== 'true') {
        aiButton.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('Korean AI search input missing');
      window.__amazonE2E.setNativeValue(input, '예쁜 여름 반팔 셔츠');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('Korean AI search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AI 기준 렌즈') && document.body.innerText.includes('스타일 기준')"), "Korean pretty AI style clarification", 60_000);
  const koreanAiPrettyBefore = await page.evaluate(`
    (() => {
      const text = document.body.innerText;
      const countMatch = text.match(/(\\d+)개 상품/);
      const productLabels = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 12);
      return {
        count: countMatch ? Number(countMatch[1]) : null,
        productLabels,
        hasStyleIntent: text.includes('스타일 기준') && text.includes('선택 필요'),
        hasClarificationOptions: ['귀엽고 발랄한', '클래식하고 단정한', '미니멀하고 깔끔한', '캐주얼 데일리'].some((label) => text.includes(label)),
      };
    })()
  `);
  const koreanAiPrettyClarificationClicked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('button')];
      const target = buttons.find((button) => button.innerText.includes('귀엽고 발랄한'))
        ?? buttons.find((button) => button.innerText.includes('클래식하고 단정한'))
        ?? buttons.find((button) => button.innerText.includes('미니멀하고 깔끔한'))
        ?? buttons.find((button) => button.innerText.includes('캐주얼 데일리'));
      if (!target) return '';
      const label = target.innerText.trim();
      target.click();
      return label;
    })()
  `);
  if (koreanAiPrettyClarificationClicked) {
    await waitFor(() => page.evaluate(`
      (() => {
        const text = document.body.innerText;
        const countMatch = text.match(/(\\d+)개 상품/);
        const count = countMatch ? Number(countMatch[1]) : null;
        const products = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 12).join('|');
        return text.includes('스타일: 귀여운')
          || text.includes('스타일: 클래식')
          || text.includes('스타일: 미니멀')
          || text.includes('스타일: 캐주얼')
          || text.includes('수정한 조건으로 결과를 업데이트했습니다')
          || (count !== null && count !== ${koreanAiPrettyBefore.count ?? "null"})
          || products !== ${JSON.stringify(koreanAiPrettyBefore.productLabels.join("|"))};
      })()
    `), "Korean pretty clarification changes results", 45_000);
  }
  const koreanAiPrettyAfter = await page.evaluate(`
    (() => {
      const text = document.body.innerText;
      const countMatch = text.match(/(\\d+)개 상품/);
      const productLabels = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 12);
      return {
        count: countMatch ? Number(countMatch[1]) : null,
        productLabels,
        hasStyleCriterion: text.includes('스타일: 귀여운') || text.includes('스타일: 클래식') || text.includes('스타일: 미니멀') || text.includes('스타일: 캐주얼'),
        cardsLocalized: productLabels.length > 0 && productLabels.every((label) => /[가-힣]/.test(label) && !/[A-Za-z]{2,}/.test(label)),
      };
    })()
  `);
  const koreanAiHistoryRestored = koreanAiPrettyClarificationClicked ? await page.evaluate(`
    (async () => {
      const beforeProducts = ${JSON.stringify(koreanAiPrettyBefore.productLabels.join("|"))};
      const buttons = [...document.querySelectorAll('button')];
      const initial = buttons.find((button) => button.innerText.includes('초기 결과'));
      if (!initial) return { hasControls: false, restoredInitial: false, reapplied: false };
      initial.click();
      await new Promise((resolve) => setTimeout(resolve, 350));
      const restoredProducts = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 12).join('|');
      const reapply = [...document.querySelectorAll('button')].find((button) => button.innerText.includes('다시 적용'));
      const restoredInitial = restoredProducts === beforeProducts;
      if (reapply) reapply.click();
      await new Promise((resolve) => setTimeout(resolve, 350));
      const reappliedProducts = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 12).join('|');
      return {
        hasControls: true,
        restoredInitial,
        reapplied: Boolean(reapply) && reappliedProducts !== beforeProducts,
      };
    })()
  `) : { hasControls: false, restoredInitial: false, reapplied: false };
  const koreanAiPrettyResult = {
    submitted: koreanAiPrettySubmitted,
    before: koreanAiPrettyBefore,
    clarificationClicked: koreanAiPrettyClarificationClicked,
    after: koreanAiPrettyAfter,
    history: koreanAiHistoryRestored,
    changedResults: Boolean(koreanAiPrettyClarificationClicked)
      && (koreanAiPrettyBefore.count !== koreanAiPrettyAfter.count || koreanAiPrettyBefore.productLabels.join("|") !== koreanAiPrettyAfter.productLabels.join("|")),
  };
  await page.evaluate("window.localStorage.setItem('aimazon.language', 'en')");
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('Refresh your closet') && document.body.innerText.includes('Shop Women')"), "home after Korean regular search");

  const categoryClicked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('main button')];
      const target = buttons.find((button) => button.innerText.includes('Shop Women'))
        ?? buttons.find((button) => button.innerText.includes('Shop Amazon Fashion'))
        ?? buttons.find((button) => button.innerText.includes('Shop'));
      if (!target) return false;
      target.click();
      return true;
    })()
  `);
  if (!categoryClicked) throw new Error("category card missing");
  await waitFor(() => page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review')"), "category filters");
  const filterVisible = await page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review') && document.body.innerText.includes('Price')");
  const initialCards = await page.evaluate("[...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare')).length");
  const regularFilterClicked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('aside section:first-child button')];
      const target = buttons.find((button) => button.innerText.trim() && !button.innerText.includes('All'));
      if (!target) return '';
      target.click();
      return target.innerText.trim();
    })()
  `);
  const regularFilterKeptListingShell = await page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review') && !document.body.innerText.trim().startsWith('Loading')");
  await wait(1000);
  await waitFor(() => page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review') && document.body.innerText.includes('items found') && !document.body.innerText.includes('Updating results')"), "regular filtered grid");
  const regularFilterResolved = await page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review') && document.body.innerText.includes('items found') && !document.body.innerText.includes('Updating results')");
  await page.evaluate("document.querySelector('aside section:first-child button')?.click()");
  await waitFor(() => page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review')"), "regular filter cleared");
  const aiInitiallyPressed = await page.evaluate("document.querySelector('button[aria-label=\"Disable AI comparison lens\"]')?.getAttribute('aria-pressed') === 'true'");

  await page.evaluate("document.querySelector('button[aria-label=\"Disable AI comparison lens\"]')?.click()");
  await waitFor(() => page.evaluate("document.querySelector('button[aria-label=\"Enable AI comparison lens\"]')?.getAttribute('aria-pressed') === 'false'"), "AI toggle off");
  const aiOffPressed = await page.evaluate("document.querySelector('button[aria-label=\"Enable AI comparison lens\"]')?.getAttribute('aria-pressed') === 'false'");

  await page.evaluate(`
    (async () => {
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('search input missing');
      window.__amazonE2E.setNativeValue(input, '${desktopAiQuery}');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('Search results for') && document.body.innerText.includes('items found')"), "regular results with AI disabled");
  const regularSearchWithoutAiLens = await page.evaluate("!document.body.innerText.includes('AI Criteria Lens')");

  await page.evaluate("document.querySelector('button[aria-label=\"Enable AI comparison lens\"]')?.click()");
  await waitFor(() => page.evaluate("document.querySelector('button[aria-label=\"Disable AI comparison lens\"]')?.getAttribute('aria-pressed') === 'true'"), "AI toggle on");
  const aiOnPressed = await page.evaluate("document.querySelector('button[aria-label=\"Disable AI comparison lens\"]')?.getAttribute('aria-pressed') === 'true'");

  await page.evaluate(`
    (async () => {
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('search input missing');
      window.__amazonE2E.setNativeValue(input, '${desktopAiQuery}');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AI Criteria Lens') && [...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare')).length >= 2"), "AI criteria results");
  const criteriaVisible = await page.evaluate("document.body.innerText.includes('Max price') || document.body.innerText.includes('Search text')");
  const semanticCriteriaVisible = await page.evaluate(`
    (() => {
      const text = document.body.innerText;
      return text.includes('Gender Target')
        && (text.includes('Party intent') || text.includes('Product Type') || text.includes('Style'));
    })()
  `);
  const beforeClarificationCount = await page.evaluate(`
    (() => {
      const match = document.body.innerText.match(/(\\d+) items found/);
      return match ? Number(match[1]) : null;
    })()
  `);
  const beforeClarificationProducts = await page.evaluate("[...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).slice(0, 12)");
  const clarificationClicked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('button')];
      const target = buttons.find((button) => button.innerText.includes('Casual party'))
        ?? buttons.find((button) => button.innerText.includes('Formal event'))
        ?? buttons.find((button) => button.innerText.includes('Statement/playful style'))
        ?? buttons.find((button) => button.innerText.includes('Polished shirt'))
        ?? buttons.find((button) => button.innerText.includes('Casual/Social'))
        ?? buttons.find((button) => button.innerText.includes('Formal/Evening'));
      if (!target) return '';
      const label = target.innerText.trim();
      target.click();
      return label;
    })()
  `);
  if (clarificationClicked) {
    await waitFor(() => page.evaluate(`
      (() => {
        const text = document.body.innerText;
        const countMatch = text.match(/(\\d+) items found/);
        const count = countMatch ? Number(countMatch[1]) : null;
        const products = [...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).slice(0, 12).join('|');
        return text.includes('Style: casual')
          || text.includes('Style: formal')
          || text.includes('Occasion: formal')
          || text.includes('Results updated')
          || (count !== null && count !== ${beforeClarificationCount ?? "null"})
          || products !== ${JSON.stringify(beforeClarificationProducts.join("|"))};
      })()
    `), "clarification criteria update", 30_000);
  }
  const afterClarificationCount = await page.evaluate(`
    (() => {
      const match = document.body.innerText.match(/(\\d+) items found/);
      return match ? Number(match[1]) : null;
    })()
  `);
  const afterClarificationProducts = await page.evaluate("[...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).slice(0, 12)");
  const clarificationChangedResults = Boolean(clarificationClicked)
    && beforeClarificationCount !== null
    && afterClarificationCount !== null
    && (beforeClarificationCount !== afterClarificationCount || beforeClarificationProducts.join("|") !== afterClarificationProducts.join("|"));

  await page.evaluate(`
    (async () => {
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('search input missing');
      window.__amazonE2E.setNativeValue(input, '${desktopFilterQuery}');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AI Criteria Lens') && [...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare')).length >= 2"), "broad AI criteria results for filters");
  const aiFilterVisible = await page.evaluate("document.body.innerText.includes('Department') && document.body.innerText.includes('Customer Review') && document.body.innerText.includes('Price')");
  const aiInitialCount = await page.evaluate(`
    (() => {
      const match = document.body.innerText.match(/(\\d+) items found/);
      return match ? Number(match[1]) : null;
    })()
  `);
  const aiFilterClicked = await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('aside button')];
      const target = buttons.find((button) => {
        const label = button.innerText.trim();
        const countMatch = label.match(/\\((\\d+)\\)/);
        const count = countMatch ? Number(countMatch[1]) : null;
        return label
          && !label.includes('All')
          && count !== null
          && count > 0
          && count < ${aiInitialCount ?? "Number.POSITIVE_INFINITY"};
      }) ?? buttons.find((button) => button.innerText.trim() && !button.innerText.includes('All'));
      if (!target) return '';
      target.click();
      return target.innerText.trim();
    })()
  `);
  await wait(500);
  const aiFilteredCount = await page.evaluate(`
    (() => {
      const match = document.body.innerText.match(/(\\d+) items found/);
      return match ? Number(match[1]) : null;
    })()
  `);
  const aiFilterChangedResults = Boolean(aiFilterClicked) && aiInitialCount !== null && aiFilteredCount !== null && aiFilteredCount < aiInitialCount;
  await page.evaluate("document.querySelector('aside section:first-child button')?.click()");
  await waitFor(() => page.evaluate("[...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare')).length >= 2"), "AI results after clearing filter");
  const productCards = await page.evaluate("[...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare')).length");
  const imageCount = await page.evaluate("[...document.images].filter((img) => img.naturalWidth > 0 && img.naturalHeight > 0).length");

  await page.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare'));
      buttons.slice(0, 2).forEach((button) => button.click());
      return buttons.length;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('2/4 selected') || document.body.innerText.includes('selected')"), "compare selection");
  const compareSelected = await page.evaluate("document.body.innerText.includes('2/4 selected') || document.body.innerText.includes('selected')");
  await waitFor(() => page.evaluate("Boolean(document.querySelector('button[aria-label=\"Expand comparison matrix\"], button[aria-label=\"Collapse comparison matrix\"]'))"), "comparison dock toggle");
  const compareButtonClicked = await page.evaluate(`
    (() => {
      const expand = document.querySelector('button[aria-label="Expand comparison matrix"]');
      if (expand) {
        expand.click();
        return true;
      }
      const collapse = document.querySelector('button[aria-label="Collapse comparison matrix"]');
      if (collapse) return true;
      return window.__amazonE2E.clickText('Compare selected');
    })()
  `);
  await waitFor(() => page.evaluate("(() => { const text = document.body.innerText.toLowerCase(); return text.includes('common ground') && text.includes('key differences') && text.includes('sort products'); })()"), "comparison matrix");
  const matrixVisible = await page.evaluate("(() => { const text = document.body.innerText.toLowerCase(); return text.includes('common ground') && text.includes('key differences'); })()");
  const matrixInsightsVisible = await page.evaluate("(() => { const text = document.body.innerText.toLowerCase(); return text.includes('common ground') && text.includes('key differences') && text.includes('sort products'); })()");
  const matrixNoEvidenceState = await page.evaluate(`
    (() => {
      const noEvidenceLabels = ['No review evidence available.', '정보 없음'];
      const cells = [...document.querySelectorAll('td')];
      const noEvidenceCells = cells.filter((cell) => noEvidenceLabels.some((label) => cell.innerText.includes(label)));
      const noEvidenceCellsWithSnippetButton = noEvidenceCells.filter((cell) => [...cell.querySelectorAll('button')].some((button) => button.innerText.includes('Source snippets') || button.innerText.includes('근거 스니펫')));
      return {
        noEvidenceCells: noEvidenceCells.length,
        noEvidenceCellsWithSnippetButton: noEvidenceCellsWithSnippetButton.length,
      };
    })()
  `);
  const matrixSortClicked = await page.evaluate("window.__amazonE2E.clickText('Lowest price')");
  await wait(300);
  const evidenceSnippetClicked = await page.evaluate("window.__amazonE2E.clickTextIncludes('Source snippets')");
  if (evidenceSnippetClicked) {
    await waitFor(() => page.evaluate("document.body.innerText.includes('Source snippets') && (document.body.innerText.includes('Review evidence') || document.body.innerText.includes('No review evidence available'))"), "comparison evidence panel", 20_000);
  }
  const evidencePanelVisible = await page.evaluate("document.body.innerText.includes('Review evidence') || document.body.innerText.includes('No review evidence available')");
  await page.screenshot(resolve(screenshotDir, "amazon2023-e2e-matrix.png"));
  const removeClicked = await page.evaluate("window.__amazonE2E.clickText('Remove')");
  await wait(500);
  const afterRemoveText = await page.evaluate("document.body.innerText");

  return {
    compactAiButton,
    headerNavVisible,
    departmentsNavClicked,
    departmentsNavScrolled,
    topRatedNavClicked,
    topRatedNavResolved,
    dealsNavClicked,
    dealsNavResolved,
    koreanRegularSearchSubmitted,
    koreanRegularSearchResult,
    koreanDetailLocalized,
    koreanAiPrettyResult,
    filterVisible,
    initialCards,
    regularFilterClicked,
    regularFilterKeptListingShell,
    regularFilterResolved,
    aiInitiallyPressed,
    aiOffPressed,
    regularSearchWithoutAiLens,
    aiOnPressed,
    criteriaVisible,
    semanticCriteriaVisible,
    clarificationClicked,
    clarificationChangedResults,
    beforeClarificationCount,
    afterClarificationCount,
    beforeClarificationProducts,
    afterClarificationProducts,
    aiFilterVisible,
    aiFilterClicked,
    aiFilterChangedResults,
    aiInitialCount,
    aiFilteredCount,
    productCards,
    imageCount,
    compareSelected,
    compareButtonClicked,
    matrixVisible,
    matrixInsightsVisible,
    matrixNoEvidenceState,
    matrixSortClicked,
    evidenceSnippetClicked,
    evidencePanelVisible,
    removeClicked,
    afterRemoveHasOneSelected: afterRemoveText.includes('1/4 selected') || afterRemoveText.includes('1 selected'),
  };
}

async function runMobileFlow(page, frontendBaseUrl) {
  await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await page.navigate(frontendBaseUrl);
  await page.evaluate(domHelpers);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AImazon')"), "mobile shell");
  await page.evaluate(`
    (async () => {
      const input = document.querySelector('input[placeholder*="AImazon"]');
      if (!input) throw new Error('mobile search input missing');
      window.__amazonE2E.setNativeValue(input, '${mobileAiQuery}');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submit = [...input.form.querySelectorAll('button')].find((button) => button.type === 'submit') ?? input.form.querySelector('button');
      if (!submit) throw new Error('mobile search submit missing');
      submit.click();
      return true;
    })()
  `);
  await waitFor(() => page.evaluate("document.body.innerText.includes('AI Criteria Lens') || document.body.innerText.includes('AI 기준 렌즈')"), "mobile AI criteria");
  await waitFor(() => page.evaluate("[...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare') || b.innerText.includes('+ 비교')).length >= 1"), "mobile product cards", 45_000);
  await waitFor(() => page.evaluate("[...document.images].filter((img) => img.naturalWidth > 0 && img.naturalHeight > 0).length >= 1"), "mobile rendered images", 20_000);
  const cardLabels = await page.evaluate("[...document.querySelectorAll('article button[aria-label]')].map((button) => button.getAttribute('aria-label')).filter(Boolean).slice(0, 8)");
  return {
    hasAiLens: await page.evaluate("document.body.innerText.includes('AI Criteria Lens') || document.body.innerText.includes('AI 기준 렌즈')"),
    productCards: await page.evaluate("[...document.querySelectorAll('button')].filter((b) => b.innerText.includes('+ Compare') || b.innerText.includes('+ 비교')).length"),
    imageCount: await page.evaluate("[...document.images].filter((img) => img.naturalWidth > 0 && img.naturalHeight > 0).length"),
    cardLabels,
    cardsLocalized: cardLabels.length > 0 && cardLabels.every((label) => /[가-힣]/.test(label) && !/[A-Za-z]{2,}/.test(label)),
  };
}

async function main() {
  await mkdir(screenshotDir, { recursive: true });
  await writeFile(progressPath, "");
  const cleanup = [];
  await stage("starting backend");
  const backend = await startBackend();
  cleanup.push(() => backend.close());
  await stage(`backend ${backend.baseUrl}`);
  await stage("starting frontend");
  const frontend = await startFrontend(backend.baseUrl);
  cleanup.push(() => frontend.close());
  await stage(`frontend ${frontend.baseUrl}`);
  await stage("starting chrome");
  const chrome = await startChrome();
  cleanup.push(() => chrome.close());
  await stage(`chrome cdp ${chrome.port}`);
  let page;
  try {
    await stage("opening page");
    page = await openPage(chrome, frontend.baseUrl);
    await stage("running desktop flow");
    const desktop = await runDesktopFlow(page, frontend.baseUrl);
    await stage("capturing desktop screenshot");
    await page.screenshot(resolve(screenshotDir, "amazon2023-e2e-desktop.png"));
    await stage("running mobile flow");
    const mobile = await runMobileFlow(page, frontend.baseUrl);
    await stage("capturing mobile screenshot");
    await page.screenshot(resolve(screenshotDir, "amazon2023-e2e-mobile.png"));
    const apiCalls = page.requests.filter((url) => url.includes("/api/"));
    const apiErrors = page.responses.filter((entry) => entry.url.includes("/api/") && entry.status >= 400);
    const consoleErrors = page.console.filter((entry) => entry.type === "error");
    const result = {
      generatedAt: new Date().toISOString(),
      backendBaseUrl: backend.baseUrl,
      frontendBaseUrl: frontend.baseUrl,
      desktop,
      mobile,
      apiCalls: [...new Set(apiCalls)].slice(0, 30),
      apiErrors,
      consoleErrors: consoleErrors.length,
      consoleErrorSamples: consoleErrors.slice(0, 5).map((entry) => (entry.args ?? []).map(consoleArgText).join(" ")).filter(Boolean),
      exceptions: page.exceptions.length,
      screenshots: {
        desktop: resolve(screenshotDir, "amazon2023-e2e-desktop.png"),
        matrix: resolve(screenshotDir, "amazon2023-e2e-matrix.png"),
        mobile: resolve(screenshotDir, "amazon2023-e2e-mobile.png"),
      },
    };
    const failures = [];
    if (!desktop.compactAiButton || desktop.compactAiButton.width > 52 || desktop.compactAiButton.visibleText) failures.push(`desktop_ai_button_not_compact:${JSON.stringify(desktop.compactAiButton)}`);
    if (!desktop.headerNavVisible) failures.push("desktop_header_nav_not_visible");
    if (!desktop.departmentsNavClicked || !desktop.departmentsNavScrolled) failures.push("desktop_departments_nav_not_working");
    if (!desktop.topRatedNavClicked || !desktop.topRatedNavResolved) failures.push("desktop_top_rated_nav_not_working");
    if (!desktop.dealsNavClicked || !desktop.dealsNavResolved) failures.push("desktop_deals_nav_not_working");
    if (!desktop.koreanRegularSearchSubmitted || desktop.koreanRegularSearchResult?.count < 1 || desktop.koreanRegularSearchResult?.hasAiLens || !desktop.koreanRegularSearchResult?.hasCards) {
      failures.push(`desktop_korean_regular_search_failed:${JSON.stringify(desktop.koreanRegularSearchResult)}`);
    }
    if (!desktop.koreanRegularSearchResult?.cardsLocalized) failures.push(`desktop_korean_product_cards_not_localized:${JSON.stringify(desktop.koreanRegularSearchResult?.cardLabels)}`);
    if (!desktop.koreanDetailLocalized?.ok) failures.push(`desktop_korean_detail_not_localized:${JSON.stringify(desktop.koreanDetailLocalized)}`);
    if (!desktop.koreanAiPrettyResult?.submitted) failures.push("desktop_korean_ai_pretty_not_submitted");
    if (!desktop.koreanAiPrettyResult?.before?.hasStyleIntent || !desktop.koreanAiPrettyResult?.before?.hasClarificationOptions) {
      failures.push(`desktop_korean_ai_pretty_missing_clarification:${JSON.stringify(desktop.koreanAiPrettyResult?.before)}`);
    }
    if (!desktop.koreanAiPrettyResult?.clarificationClicked) failures.push(`desktop_korean_ai_pretty_clarification_not_clicked:${JSON.stringify(desktop.koreanAiPrettyResult)}`);
    if (!desktop.koreanAiPrettyResult?.after?.hasStyleCriterion || !desktop.koreanAiPrettyResult?.changedResults) {
      failures.push(`desktop_korean_ai_pretty_clarification_did_not_apply:${JSON.stringify(desktop.koreanAiPrettyResult)}`);
    }
    if (!desktop.koreanAiPrettyResult?.history?.hasControls || !desktop.koreanAiPrettyResult?.history?.restoredInitial || !desktop.koreanAiPrettyResult?.history?.reapplied) {
      failures.push(`desktop_korean_ai_history_restore_failed:${JSON.stringify(desktop.koreanAiPrettyResult?.history)}`);
    }
    if (!desktop.koreanAiPrettyResult?.after?.cardsLocalized) failures.push(`desktop_korean_ai_pretty_cards_not_localized:${JSON.stringify(desktop.koreanAiPrettyResult?.after?.productLabels)}`);
    if (!desktop.filterVisible) failures.push("desktop_filters_not_visible");
    if (!desktop.regularFilterClicked) failures.push("desktop_regular_filter_not_clicked");
    if (!desktop.regularFilterKeptListingShell) failures.push("desktop_regular_filter_caused_full_reload");
    if (!desktop.regularFilterResolved) failures.push("desktop_regular_filter_did_not_resolve");
    if (!desktop.aiInitiallyPressed) failures.push("desktop_ai_initially_not_enabled");
    if (!desktop.aiOffPressed) failures.push("desktop_ai_toggle_off_failed");
    if (!desktop.regularSearchWithoutAiLens) failures.push("desktop_ai_disabled_search_showed_lens");
    if (!desktop.aiOnPressed) failures.push("desktop_ai_toggle_on_failed");
    if (!desktop.criteriaVisible) failures.push("desktop_criteria_not_visible");
    if (!desktop.semanticCriteriaVisible) failures.push("desktop_semantic_criteria_not_visible");
    if (!desktop.clarificationClicked) failures.push("desktop_clarification_not_clicked");
    if (!desktop.clarificationChangedResults) failures.push("desktop_clarification_did_not_change_results");
    if (!desktop.aiFilterVisible) failures.push("desktop_ai_filters_not_visible");
    if (!desktop.aiFilterChangedResults) failures.push("desktop_ai_filter_did_not_change_results");
    if (desktop.productCards < 2) failures.push(`desktop_too_few_product_cards:${desktop.productCards}`);
    if (desktop.imageCount < 1) failures.push("desktop_no_rendered_images");
    if (!desktop.compareSelected) failures.push("desktop_compare_selection_missing");
    if (!desktop.matrixVisible) failures.push("desktop_matrix_missing");
    if (!desktop.matrixInsightsVisible) failures.push("desktop_matrix_insights_missing");
    if ((desktop.matrixNoEvidenceState?.noEvidenceCellsWithSnippetButton ?? 0) > 0) failures.push(`desktop_matrix_no_evidence_cells_clickable:${JSON.stringify(desktop.matrixNoEvidenceState)}`);
    if (!desktop.matrixSortClicked) failures.push("desktop_matrix_sort_not_clicked");
    if (!desktop.evidenceSnippetClicked || !desktop.evidencePanelVisible) failures.push(`desktop_matrix_evidence_panel_missing:${JSON.stringify({ clicked: desktop.evidenceSnippetClicked, visible: desktop.evidencePanelVisible })}`);
    if (!desktop.removeClicked) failures.push("desktop_remove_not_clicked");
    if (!mobile.hasAiLens) failures.push("mobile_ai_lens_missing");
    if (mobile.productCards < 1) failures.push(`mobile_too_few_product_cards:${mobile.productCards}`);
    if (mobile.imageCount < 1) failures.push("mobile_no_rendered_images");
    if (!mobile.cardsLocalized) failures.push(`mobile_korean_product_cards_not_localized:${JSON.stringify(mobile.cardLabels)}`);
    if (apiErrors.length) failures.push(`api_errors:${apiErrors.length}`);
    if (page.exceptions.length) failures.push(`runtime_exceptions:${page.exceptions.length}`);
    result.failures = failures;
    await writeFile(resolve(screenshotDir, "amazon2023-e2e-report.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    const failure = {
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.stack ?? error.message : String(error),
      requests: page?.requests ?? [],
      responses: page?.responses ?? [],
      console: page?.console ?? [],
      exceptions: page?.exceptions ?? [],
      visibleText: page ? await page.evaluate("document.body.innerText").catch((evalError) => String(evalError)) : "",
      currentUrl: page ? await page.evaluate("location.href").catch(() => "") : "",
    };
    if (page) {
      await page.screenshot(resolve(screenshotDir, "amazon2023-e2e-failure.png")).catch(() => undefined);
    }
    await writeFile(resolve(screenshotDir, "amazon2023-e2e-failure.json"), JSON.stringify(failure, null, 2));
    throw error;
  } finally {
    await stage("cleaning up");
    for (const close of cleanup.reverse()) {
      await close().catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message ?? error);
  process.exitCode = 1;
});
