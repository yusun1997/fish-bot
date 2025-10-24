require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const fs = require("fs");

const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 900);
const DATA_FILE = process.env.DATA_FILE || "userData.json";

const client = new Client({
  intents: [GatewayIntentBits.Guilds], // ✅ 只需 Guilds，不讀訊息內容
});

// 最小 http server，讓 Cloud Run 健康檢查通過
const http = require("http");
const PORT = process.env.PORT || 8080;
http
  .createServer((req, res) => res.end("ok"))
  .listen(PORT, () => {
    console.log(`HTTP health server listening on ${PORT}`);
  });

// --- 讀/寫資料 ---
function safeLoad() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (_) {
    return {};
  }
}

function safeSave(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
}

// ✅ 以「台北時間中午 12:00」為日界線
function todayKeyByNoon() {
  const tz = process.env.TZ || "Asia/Taipei";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  now.setHours(now.getHours() - 12);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ✅ 清理七天以前的資料
function cleanupOldData(store, keepDays = 7) {
  const now = Date.now();
  const DAY_MS = 86400000;
  for (const key of Object.keys(store)) {
    const date = new Date(key);
    if (isNaN(date)) continue;
    const diff = (now - date.getTime()) / DAY_MS;
    if (diff > keepDays) delete store[key];
  }
}

// ✅ 初始化資料
let data = safeLoad();
cleanupOldData(data);
safeSave(data);

client.once(Events.ClientReady, () => {
  console.log(`✅ 已登入：${client.user.tag}`);
});

// ✅ Slash Command 觸發事件（唯一入口）
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return; // 只響應 Slash 指令

  const date = todayKeyByNoon();
  const guildId = i.guildId ?? "dm";
  data[date] ??= {};
  data[date][guildId] ??= {};
  const uid = i.user.id;

  // /add amount:<number>
  if (i.commandName === "add") {
    const amount = i.options.getInteger("amount", true);
    const cur = (data[date][guildId][uid] ??= 0);
    const next = cur + amount;
    data[date][guildId][uid] = next;
    safeSave(data);

    let msg = `你今天的累積金額是 **${next}** 元。`;
    if (next >= DAILY_LIMIT) msg += " 🚨 你已達上限（或超過）！";
    else if (next >= DAILY_LIMIT - 100)
      msg += ` ⚠️ 快達上限了（剩 ${DAILY_LIMIT - next} 元）`;
    await i.reply({ content: msg, ephemeral: true });
  }

  // /status
  if (i.commandName === "status") {
    const cur = data[date][guildId][uid] ?? 0;
    const remaining = Math.max(DAILY_LIMIT - cur, 0);
    const msg =
      cur > DAILY_LIMIT
        ? `你今天累積：**${cur} 元**（已超過上限！）`
        : `你今天累積：**${cur} 元**\n距離上限還有：**${remaining} 元**`;
    await i.reply({ content: msg, ephemeral: true });
  }

  // /cleanup
  if (i.commandName === "cleanup") {
    const before = Object.keys(data).length;
    cleanupOldData(data);
    safeSave(data);
    const after = Object.keys(data).length;
    await i.reply({
      content: `已清理舊資料：${before - after} 筆（僅保留近 7 天）`,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
