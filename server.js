const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 1. ENDPOINT WEBHOOK TRAKTEER
// ==========================================
app.post('/api/handler', async (req, res) => {
    try {
        const body = req.body;
        console.log("Data dari Trakteer:", JSON.stringify(body));

        const data = body.data || body; 
        const supporter_email = data.supporter_email || data.email;
        const amount = data.amount || data.quantity || data.total || 0; 
        const supporter_name = data.supporter_name || 'Donatur';

        if (!supporter_email) {
            return res.status(400).json({ success: false, message: 'Email tidak ditemukan dalam request' });
        }

        const user = await prisma.user.findUnique({
            where: { email: supporter_email }
        });

        if (user) {
            await prisma.user.update({
                where: { email: supporter_email },
                data: {
                    saldo: {
                        increment: parseInt(amount)
                    }
                }
            });
            console.log(`✅ Saldo ${supporter_email} bertambah Rp${amount} dari ${supporter_name}`);
            return res.status(200).json({ success: true, message: 'Saldo berhasil ditambahkan' });
        } else {
            console.log(`❌ Email ${supporter_email} tidak terdaftar di database.`);
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

    } catch (error) {
        console.error("Error Webhook:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// ==========================================
// 2. ENDPOINT API LAINNYA (Chat, Transactions, Dll)
// ==========================================
// Contoh endpoint Chat AI (Sesuaikan dengan kode lu sebelumnya)
app.post('/api/chat', async (req, res) => {
    try {
        // Logika AI Chat lu di sini (Gemini/DeepSeek)
        return res.status(200).json({ success: true, message: 'Chat endpoint ready' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Contoh endpoint Riwayat Transaksi
app.get('/api/transactions/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const transactions = await prisma.transaction.findMany({
            where: { user: { email: email } }
        });
        return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 3. ROUTING UNTUK FILE STATIS (HTML, CSS, JS)
// ==========================================
// Biar web lu bisa diakses (index.html, chat.html, dll)
app.use(express.static(path.join(__dirname)));

// Fallback: Kalau route nggak ketemu, arahkan ke index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 4. EXPORT UNTUK VERCEL
// ==========================================
// PENTING: Jangan pake app.listen() karena Vercel Serverless
module.exports = app;