import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const data = req.body; 
        const amountPaid = Number(data.price || data.net_amount || data.amount);
        console.log(`Dana masuk: Rp ${amountPaid}`);

        // Cari transaksi PENDING yang nominalnya cocok
        const transaction = await prisma.transaction.findFirst({
            where: { 
                totalAmount: amountPaid,
                status: 'PENDING'
            }
        });

        if (transaction) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'SUCCESS' }
            });

            await prisma.user.update({
                where: { id: transaction.userId },
                data: { saldo: { increment: transaction.amount } }
            });

            console.log(`✅ Saldo berhasil ditambah untuk transaksi ${transaction.id}`);
        } else {
            console.log(`❌ Tidak ada transaksi PENDING dengan nominal Rp ${amountPaid}`);
        }

        return res.status(200).json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}