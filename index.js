const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1530240281784356925'; 

const JSONBIN_ID = "6a638146f5f4af5e29bbd8a6";
const MASTER_KEY = "$2a$10$1LL03wxVJkypE56M6e0xmOkiTSjRcdoEj/upYKtl0iNvAY2knfyP6";

const OWNER_PHONE = "0945060772"; 

const PRICELIST = {
    'permanent': { name: '👑 คีย์ถาวร (Permanent)', price: 60, duration: 'permanent' },
    '30d': { name: '⏳ คีย์ 30 วัน', price: 40, duration: '30d' }
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

process.on('unhandledRejection', error => {
    console.error('🛡️ ระบบดักจับข้อผิดพลาด:', error);
});

client.once('ready', () => {
    console.log(`🤖 บอทร้านออนไลน์เสถียรบน Render แล้ว!`);
    registerCommands();
});

async function registerCommands() {
    const commands = [
        new SlashCommandBuilder().setName('panel').setDescription('📢 [Admin] ส่งแผงร้านค้า'),
        new SlashCommandBuilder().setName('addpoint').setDescription('💰 [Admin] เติมพอยท์ให้ลูกค้า')
            .addUserOption(opt => opt.setName('user').setDescription('ลูกค้า').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('จำนวน').setRequired(true)),
        new SlashCommandBuilder().setName('addkey').setDescription('🔑 [Admin] เติมคีย์จริงเข้าสต็อก')
            .addStringOption(opt => opt.setName('keys').setDescription('ใส่คีย์คั่นด้วยการเว้นวรรค').setRequired(true))
            .addStringOption(opt => opt.setName('duration').setDescription('ประเภทคีย์').setRequired(true)
                .addChoices({name:'30 วัน',value:'30d'},{name:'ถาวร',value:'permanent'})),
        new SlashCommandBuilder().setName('genpromo').setDescription('🎁 [Admin] สร้างโค้ดเติมพอยท์ฟรี')
            .addStringOption(opt => opt.setName('code').setDescription('ชื่อโค้ด').setRequired(true))
            .addIntegerOption(opt => opt.setName('points').setDescription('จำนวนพอยท์').setRequired(true))
            .addIntegerOption(opt => opt.setName('maxuse').setDescription('จำนวนครั้งที่ใช้ได้').setRequired(true))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    } catch (e) { console.error(e); }
}

async function getJsonBin() {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, { 
            method: 'GET', 
            headers: { 'X-Master-Key': MASTER_KEY } 
        });
        const data = await res.json();
        let record = data.record || {};
        
        // ตรวจสอบและสร้างโครงสร้างข้อมูลเพื่อป้องกันข้อผิดพลาด undefined
        if (!record.keys || typeof record.keys !== 'object') record.keys = {};
        if (!record.users || typeof record.users !== 'object') record.users = {};
        if (!Array.isArray(record.usedVouchers)) record.usedVouchers = [];
        if (!record.promocodes || typeof record.promocodes !== 'object') record.promocodes = {};
        
        return record;
    } catch (e) {
        console.error('Error fetching JSONBin:', e);
        return { keys: {}, users: {}, usedVouchers: [], promocodes: {} };
    }
}

async function updateJsonBin(recordData) {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
            method: 'PUT',
            headers: { 'X-Master-Key': MASTER_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
        });
        return res.ok;
    } catch (e) {
        console.error('Error updating JSONBin:', e);
        return false;
    }
}

async function createShopEmbed() {
    const db = await getJsonBin();
    let stockPermanent = 0;
    if (db.keys) {
        for (const [k, v] of Object.entries(db.keys)) {
            if (v && v.duration === 'permanent') stockPermanent++;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('👑 GODZILLA SHOP')
        .setDescription('🏪 ยินดีต้อนรับสู่ Godzilla Shop\n💰 ระบบเติมเงินอัตโนมัติผ่าน TrueMoney\n🔒 คีย์แท้จากระบบสคริปต์เกม 100%')
        .addFields(
            { name: '📦 สินค้า', value: `👑 คีย์ถาวร = **${PRICELIST['permanent'].price} บาท**`, inline: false },
            { name: '📊 สต็อก', value: `👑 คงเหลือ: **${stockPermanent} คีย์**`, inline: false }
        )
        .setFooter({ text: 'Godzilla Shop | กดปุ่มซื้อเลย' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_permanent').setLabel(`👑 ซื้อคีย์ถาวร (${PRICELIST['permanent'].price}฿)`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('open_topup_modal').setLabel('💰 เติมเงิน').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('check_balance').setLabel('💳 เช็คยอดเงิน').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('my_history').setLabel('📜 ประวัติของฉัน').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('my_keys').setLabel('🔑 คีย์ของฉัน').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_promo_modal').setLabel('🎁 กรอกโค้ด').setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row1, row2] };
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, member, options } = interaction;
            if (commandName === 'panel') {
                if (!member.permissions.has('Administrator')) return interaction.reply({ content: '❌ เฉพาะ Admin', ephemeral: true });
                return interaction.reply(await createShopEmbed());
            }
            if (commandName === 'addpoint') {
                if (!member.permissions.has('Administrator')) return interaction.reply({ content: '❌ เฉพาะ Admin', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const targetUser = options.getUser('user');
                const amount = options.getInteger('amount');
                const db = await getJsonBin();
                
                if (!db.users[targetUser.id]) db.users[targetUser.id] = { points: 0, history: [], keys: [], usedCodes: [] };
                db.users[targetUser.id].points += amount;
                
                if (await updateJsonBin(db)) return interaction.editReply({ content: `✅ เติมพอยท์ให้ <@${targetUser.id}> สำเร็จ **+${amount} พอยท์**` });
            }
            if (commandName === 'addkey') {
                if (!member.permissions.has('Administrator')) return interaction.reply({ content: '❌ เฉพาะ Admin', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const rawKeys = options.getString('keys');
                const duration = options.getString('duration');
                const keyList = rawKeys.split(/[\s\n]+/).filter(k => k.trim().length > 0);

                const db = await getJsonBin();
                if (!db.keys) db.keys = {};

                let addedCount = 0;
                for (const k of keyList) {
                    if (!db.keys[k]) {
                        db.keys[k] = { duration: duration };
                        addedCount++;
                    }
                }
                if (await updateJsonBin(db)) {
                    return interaction.editReply({ content: `✅ เพิ่มคีย์จริงเข้าสต็อกสำเร็จ **${addedCount} คีย์** (${duration})` });
                }
            }
        }

        if (interaction.isButton()) {
            const customId = interaction.customId;
            const userId = interaction.user.id;

            if (customId === 'open_topup_modal') {
                const modal = new ModalBuilder().setCustomId('topup_voucher_modal').setTitle('🧧 เติมเงินผ่านซองอั่งเปา');
                const voucherInput = new TextInputBuilder().setCustomId('voucher_link').setLabel('ลิงก์ซองอั่งเปา TrueMoney Wallet').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(voucherInput));
                return interaction.showModal(modal);
            }
            if (customId === 'open_promo_modal') {
                const modal = new ModalBuilder().setCustomId('promo_code_modal').setTitle('🎁 กรอกโค้ดรับพอยท์');
                const codeInput = new TextInputBuilder().setCustomId('promo_code_input').setLabel('ใส่โค้ดของคุณ').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
                return interaction.showModal(modal);
            }
            if (customId === 'check_balance') {
                const db = await getJsonBin();
                const userPoints = db.users[userId]?.points || 0;
                return interaction.reply({ content: `💳 ยอดเงินคงเหลือของคุณ: **${userPoints} บาท**`, ephemeral: true });
            }
            if (customId === 'my_history' || customId === 'my_keys') {
                const db = await getJsonBin();
                if (!db.users) db.users = {};
                if (!db.users[userId]) db.users[userId] = { points: 0, history: [], keys: [], usedCodes: [] };
                const user = db.users[userId];
                
                if (!user.keys || user.keys.length === 0) return interaction.reply({ content: `🔑 คุณยังไม่มีคีย์ช็อปนี้`, ephemeral: true });
                return interaction.reply({ content: `🔑 **คีย์ของคุณทั้งหมด:**\n${user.keys.map((k, i) => `${i+1}. \`${k}\``).join('\n')}`, ephemeral: true });
            }
            if (customId === 'buy_permanent') {
                await interaction.deferReply({ ephemeral: true });
                const product = PRICELIST['permanent'];
                const db = await getJsonBin();
                
                if (!db.users) db.users = {};
                if (!db.users[userId]) db.users[userId] = { points: 0, history: [], keys: [], usedCodes: [] };
                if (!db.users[userId].keys) db.users[userId].keys = [];
                if (!db.users[userId].history) db.users[userId].history = [];

                if (db.users[userId].points < product.price) return interaction.editReply({ content: `❌ พอยท์ไม่พอ ต้องการ ${product.price} บาท` });

                let foundKey = null;
                if (db.keys) {
                    for (const [k, v] of Object.entries(db.keys)) {
                        if (v && v.duration === 'permanent') { foundKey = k; break; }
                    }
                }
                if (!foundKey) return interaction.editReply({ content: `❌ ขออภัย สินค้าในบอทหมดสต็อกชั่วคราว` });

                delete db.keys[foundKey];
                db.users[userId].points -= product.price;
                db.users[userId].keys.push(foundKey);
                db.users[userId].history.push({ key: foundKey, time: new Date().toLocaleString() });

                if (await updateJsonBin(db)) {
                    return interaction.editReply({ content: `🎉 **ซื้อสินค้าสำเร็จ!**\n🔑 คีย์แท้ของคุณคือ: \`${foundKey}\`` });
                }
            }
        }
    } catch (err) {
        console.error('🛡️ ตรวจพบข้อผิดพลาด:', err);
    }
});

app.get('/', (req, res) => res.send('Bot Status: ONLINE'));
app.listen(process.env.PORT || 3000, () => console.log('📡 Server Ready'));
client.login(TOKEN);
