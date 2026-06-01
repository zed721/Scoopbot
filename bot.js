const Discord = require('discord.js');
const requestPromise = require('request-promise');
const fs = require('fs');
const path = require('path');

const client = new Discord.Client({ 
    intents: [
        Discord.GatewayIntentBits.Guilds, 
        Discord.GatewayIntentBits.GuildMessages, 
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages
    ] 
});

const proxy = "http://CnUvt9XpMADgyJq:IEm97oGXASdTlQv@156.232.90.75:44282";

const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const numset = '0123456789'.split('');

const random = (x = 0, y = 1) => Math.floor(Math.random() * (y - x + 1)) + x;

const generateId = (len, numbersOnly) => {
    const set = numbersOnly ? numset : charset;
    let r = '';
    for (let i = 0; i < len; i++) {
        r += set[random(0, set.length - 1)];
    }
    return r;
};

const request = async (url) => {
    try {
        const content = await requestPromise({
            url: url,
            proxy: proxy,
            method: "GET",
            headers: url.match(/https:\/\/\w+\.roblox\.com/) ? undefined : {
                "traceparent": `00-${generateId(32)}-00`,
                "Roblox-Id": generateId(16, true),
                "User-Agent": `Roblox/WinInet`,
                "Krnl-Fingerprint": generateId(16)
            }
        });

        return [true, content];
    } catch (err) {
        console.error("fetch error", err);
        if (!err.statusCode) return [false, "> Unable to fetch url, message: Unable to establish connection."];
        return [false, `> Unable to fetch url, message: ${err.statusCode}: ${err.response ? err.response.statusMessage : "NO_STATUS_MESSAGE"}`];
    }
};

// Create dumps folder if it doesn't exist
const dumpsDir = './dumps';
if (!fs.existsSync(dumpsDir)) {
    fs.mkdirSync(dumpsDir, { recursive: true });
}

client.on('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!fetch ')) {
        const url = message.content.slice(7).trim();

        if (!url) {
            return message.reply('❌ Please provide a URL!\nUsage: `!fetch <https://example.com>`');
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return message.reply('❌ URL must start with `http://` or `https://`');
        }

        // Show typing indicator
        await message.channel.sendTyping();
        
        // Fetch the content
        const [success, content] = await request(url);

        if (!success) {
            return message.reply(`❌ Error:\n\`\`\`\n${content}\n\`\`\``);
        }

        try {
            // Save to script.lua
            const filePath = path.join(dumpsDir, 'script.lua');
            fs.writeFileSync(filePath, content, 'utf-8');

            // Send the file
            const file = new Discord.AttachmentBuilder(filePath, { name: 'script.lua' });
            
            message.reply({
                content: `✅ Successfully fetched and saved!`,
                files: [file]
            });

            console.log(`📝 Saved fetched content to ${filePath}`);

        } catch (err) {
            console.error("File save error:", err);
            message.reply(`❌ Error saving file: ${err.message}`);
        }
    }
});

client.login(process.env.TOKEN);
