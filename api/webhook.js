const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const body = req.body;

        // KITA PRINT DATA ASLINYA BIAR KETAUAN
        console.log("Data dari Trakteer:", JSON.stringify(body, null, 2));

        // Respon 200 aja dulu biar Trakteer ijo
        return res.status(200).json({ success: true, message: 'Data diterima, cek log Vercel' });

    } catch (error) {
        console.error("Error Webhook:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};