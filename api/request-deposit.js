import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { userId, amount } = req.body;

    try {
        // Bikin kode unik 1-999
        const uniqueCode = Math.floor(Math.random() * 999) + 1;
        const totalAmount = Number(amount) + uniqueCode;

        // Simpen ke Database
        const trx = await prisma.transaction.create({
            data: {
                userId: userId,
                type: 'deposit',
                amount: Number(amount),
                uniqueCode: uniqueCode,
                totalAmount: totalAmount,
                status: 'PENDING'
            }
        });

        return res.status(200).json({ 
            success: true, 
            uniqueCode: uniqueCode, 
            totalAmount: totalAmount,
            message: `Silakan bayar tepat Rp ${totalAmount} ke Trakteer`
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}