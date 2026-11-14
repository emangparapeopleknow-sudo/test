require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, method, body } = req;
    const path = url.split('?')[0];

    try {
        // AUTH GOOGLE
        if (path === '/api/auth/google' && method === 'POST') {
            const { token } = body;
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                const email = payload.email;
                const name = payload.name;
                const picture = payload.picture;

                let user = await prisma.user.findUnique({ where: { email } });
                if (!user) {
                    user = await prisma.user.create({ 
                        data: { nama: name, email: email, password: 'GOOGLE_OAUTH_' + Math.random().toString(36) } 
                    });
                }
                return res.json({ success: true, user: { ...user, avatar: picture } });
            } catch (error) {
                return res.status(401).json({ success: false, message: 'Token Google tidak valid!' });
            }
        }

        // AUTH MANUAL
        if (path === '/api/register' && method === 'POST') {
            const { nama, email, password } = body;
            if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ success: false, message: 'Email dipakai!' });
            const newUser = await prisma.user.create({ data: { nama, email, password } });
            return res.json({ success: true, message: 'Registrasi Berhasil!', user: newUser });
        }

        if (path === '/api/login' && method === 'POST') {
            const { email, password } = body;
            const user = await prisma.user.findFirst({ where: { email, password } });
            if (!user) return res.status(401).json({ success: false, message: 'Email/Password salah!' });
            return res.json({ success: true, message: 'Login Berhasil!', user });
        }

        // GEMINI AI
        if (path === '/api/gemini' && method === 'POST') {
            const { prompt, email } = body;
            const user = await prisma.user.findUnique({ where: { email } });
            if (user.tier !== 'free' && user.expiredAt && new Date(user.expiredAt) < new Date()) {
                await prisma.user.update({ where: { email }, data: { tier: 'free', expiredAt: null } });
                return res.status(403).json({ success: false, message: 'Paket expired, silakan beli lagi.' });
            }
            const isBasaBasi = ['halo', 'hai', 'pagi', 'tes'].some(k => prompt.toLowerCase().includes(k)) && !['buatkan', 'bikin', 'kode'].some(k => prompt.toLowerCase().includes(k));
            if (user.tier === 'free' && isBasaBasi && user.chatCount >= 20) return res.status(403).json({ success: false, message: 'Limit basa-basi habis!', limitReached: true });
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-4-hydrogen', contents: prompt });
            if (user.tier === 'free' && isBasaBasi) await prisma.user.update({ where: { email }, data: { chatCount: user.chatCount + 1 } });
            return res.json({ success: true, text: response.text });
        }

        // CHAT HISTORY
        if (path === '/api/chat/save' && method === 'POST') {
            const { email, sender, message } = body;
            const user = await prisma.user.findUnique({ where: { email }, include: { chats: { orderBy: { createdAt: 'asc' } } } });
            let msg = message.length > 500 ? message.substring(0, 500) + '...' : message;
            await prisma.chatHistory.create({ data: { userId: user.id, sender, message: msg } });
            if (user.chats.length >= 10) await prisma.chatHistory.delete({ where: { id: user.chats[0].id } });
            return res.json({ success: true });
        }

        if (path.startsWith('/api/chat/history/') && method === 'GET') {
            const email = path.split('/').pop();
            const user = await prisma.user.findUnique({ where: { email } });
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            await prisma.chatHistory.deleteMany({ where: { userId: user.id, createdAt: { lt: sevenDaysAgo } } });
            const fresh = await prisma.user.findUnique({ where: { email }, include: { chats: { orderBy: { createdAt: 'asc' } } } });
            return res.json({ success: true, history: fresh.chats });
        }

        if (path.startsWith('/api/chat/clear/') && method === 'DELETE') {
            const email = path.split('/').pop();
            const user = await prisma.user.findUnique({ where: { email } });
            await prisma.chatHistory.deleteMany({ where: { userId: user.id } });
            return res.json({ success: true });
        }

        // WEBHOOK TRAKTEER (TAMBAH SALDO OTOMATIS)
        if (path === '/api/trakteer-webhook' && method === 'POST') {
            const { quantity, message } = body; // Trakteer ngirim data ini
            const emailUser = message; 
            const nominalMasuk = parseInt(quantity) * 1000; // 1 unit = Rp 1.000

            if (!emailUser) return res.status(400).send('Email tidak ditemukan.');
            
            const user = await prisma.user.findUnique({ where: { email: emailUser } });
            if (!user) return res.status(404).send('User tidak terdaftar.');

            await prisma.user.update({ where: { email: emailUser }, data: { saldo: user.saldo + nominalMasuk } });
            await prisma.transaction.create({ data: { userId: user.id, type: 'deposit', amount: nominalMasuk, status: 'success', method: 'Trakteer' } });
            
            return res.status(200).send('OK');
        }

        // CHECKOUT & AKTIVASI
        if (path === '/api/checkout' && method === 'POST') {
            const { email, paket, harga, tier } = body;
            const user = await prisma.user.findUnique({ where: { email } });
            if (user.tier !== 'free' && user.expiredAt && new Date(user.expiredAt) > new Date()) {
                return res.status(400).json({ success: false, message: `STATUS: ${user.tier.toUpperCase()}\nBELUM EXPIRED!\nTIDAK BISA MEMBELI.` });
            }
            if (user.saldo < parseInt(harga)) return res.status(400).json({ success: false, message: 'Saldo kurang!' });
            
            await prisma.user.update({ where: { email }, data: { saldo: user.saldo - parseInt(harga) } });
            const kode = `LYZ-${tier.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await prisma.transaction.create({ data: { userId: user.id, type: 'purchase', amount: parseInt(harga), status: 'success', method: 'Saldo', activationCode: kode } });
            return res.json({ success: true, message: 'Berhasil! Cek Kode di Riwayat.', code: kode });
        }

        if (path === '/api/activate' && method === 'POST') {
            const { email, code } = body;
            const user = await prisma.user.findUnique({ where: { email } });
            const trx = await prisma.transaction.findFirst({ where: { activationCode: code, userId: user.id, isUsed: false } });
            if (!trx) return res.status(404).json({ success: false, message: 'Kode tidak valid/sudah dipakai!' });
            const expiredDate = new Date(); expiredDate.setDate(expiredDate.getDate() + 30);
            let newTier = code.includes('VIP') ? 'vip' : (code.includes('VVIP') ? 'vvip' : 'pro');
            const updatedUser = await prisma.user.update({ where: { email }, data: { tier: newTier, expiredAt: expiredDate } });
            await prisma.transaction.update({ where: { id: trx.id }, data: { isUsed: true } });
            return res.json({ success: true, message: 'Aktivasi Berhasil!', user: updatedUser });
        }

        if (path.startsWith('/api/transactions/') && method === 'GET') {
            const email = path.split('/').pop();
            const user = await prisma.user.findUnique({ where: { email }, include: { transactions: { orderBy: { createdAt: 'desc' } } } });
            return res.json({ success: true, transactions: user.transactions });
        }

        return res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};