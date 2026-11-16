const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (req, res) => {
    // 1. Cek Method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const body = req.body;
        
        // 2. Verifikasi Token (Ambil token dari dashboard Trakteer lu)
        // Ganti "TOKEN_RAHASIA_LU" pake token yang ada di gambar lu tadi (yang di-hidden)
        const expectedToken = "trhook-gvvcJBEmPKFx3SKWGMRf3a2o"; 
        
        // Trakteer biasanya ngirim token di header 'x-trakteer-token' atau di body.token
        // Cek dokumentasi Trakteer, kalau dari body:
        // if (body.token !== expectedToken) return res.status(401).json({ message: 'Unauthorized' });

        // 3. Ambil Data Donasi (Sesuaikan dengan format JSON dari Trakteer)
        // Trakteer ngirim data dalam bentuk object
        const { supporter_name, supporter_email, quantity, message } = body;

        if (!supporter_email) {
            return res.status(400).json({ message: 'Email tidak ditemukan' });
        }

        // 4. Logika Update Saldo di Database Prisma
        // Cari user berdasarkan email, terus tambahin saldo mereka
        const user = await prisma.user.findUnique({
            where: { email: supporter_email }
        });

        if (user) {
            await prisma.user.update({
                where: { email: supporter_email },
                data: {
                    saldo: {
                        increment: quantity // Nambah saldo sesuai nominal donasi
                    }
                }
            });
            console.log(`Saldo ${supporter_email} bertambah Rp${quantity}`);
        } else {
            console.log(`Email ${supporter_email} tidak terdaftar di web.`);
        }

        // 5. Kasih respon 200 OK ke Trakteer biar mereka tau webhook sukses
        return res.status(200).json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error("Error Webhook:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}