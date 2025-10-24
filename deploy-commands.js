// deploy-commands.js
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  // /add amount:<integer>
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("回報你這次賣出的魚貨金額")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("這次賣魚的金額")
        .setRequired(true)
    ),

  // /status
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("查看你今天的累積金額與距離上限的差距"),

  // /cleanup
  new SlashCommandBuilder()
    .setName("cleanup")
    .setDescription("清除七天前的舊資料"),
].map((command) => command.toJSON());

// 建立 REST 實例
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 正在註冊 (deploy) Slash 指令...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ 指令註冊完成！");
    console.log("👉 現在你可以使用以下指令：/add、/status、/cleanup");
  } catch (error) {
    console.error("❌ 註冊過程出錯：", error);
  }
})();
