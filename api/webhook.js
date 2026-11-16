const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (req, res) => {
    // 1. Cek Method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const body = req.body;

        // 2. Verifikasi Token (Ambil dari Environment Variable Vercel)
        const expectedToken = process.env.TRAKTEER_TOKEN;
        
        // Trakteer ngirim token di header 'x-trakteer-token' atau di body (cek dokumentasi)
        // Sementara kita bypass dulu verifikasi tokennya biar lu bisa tes masukin saldo
        /*
        if (body.token !== expectedToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        */

        // 3. Ambil Data Donasi (Trakteer membungkus data di dalam 'body.data')
        const data = body.data; 
        
        if (!data) {
            return res.status(400).json({ success: false, message: 'Data tidak ditemukan' });
        }

        const supporter_email = data.supporter_email;
        const amount = data.amount || data.quantity; // Sesuaikan field nominal dari Trakteer
        const supporter_name = data.supporter_name;

        if (!supporter_email) {
            return res.status(400).json({ success: false, message: 'Email tidak ditemukan' });
        }

        // 4. Logika Update Saldo di Database Prisma
        const user = await prisma.user.findUnique({
            where: { email: supporter_email }
        });

        if (user) {
            await prisma.user.update({
                where: { email: supporter_email },
                data: {
                    saldo: {
                        increment: amount // Nambah saldo
                    }
                }
            });
            console.log(`Saldo ${supporter_email} bertambah Rp${amount}`);
        } else {
            console.log(`Email ${supporter_email} tidak terdaftar di web.`);
        }

        // 5. Kasih respon 200 OK ke Trakteer
        return res.status(200).json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error("Error Webhook:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



