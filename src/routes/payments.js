const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const mercadopago = require('../middleware/mercadopago');

// CLIENTE: Criar preferência de pagamento para fotos extras
router.post('/extra-photos', async (req, res) => {
    try {
        const { sessionId, accessCode, photos } = req.body;
        
        // 1. Validar sessão e acesso
        const session = await Session.findOne({ 
            _id: sessionId, 
            accessCode, 
            isActive: true 
        });

        if (!session) return res.status(401).json({ error: 'Acesso negado' });
        if (session.selectionStatus !== 'submitted') {
            return res.status(400).json({ error: 'A seleção precisa ser enviada antes de pagar extras' });
        }

        // 2. Validar fotos selecionadas como extras
        // Garantir que as fotos existem na sessão e não estão na seleção principal
        const validPhotos = photos.filter(pid => 
            session.photos.some(p => p.id === pid) && 
            !session.selectedPhotos.includes(pid)
        );

        if (validPhotos.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto extra válida selecionada' });
        }

        // 3. Calcular preço
        const photosCount = validPhotos.length;
        const totalPrice = photosCount * (session.extraPhotoPrice || 25);

        // 4. Salvar solicitação pendente no banco
        session.extraRequest = {
            status: 'pending',
            photos: validPhotos,
            requestedAt: new Date(),
            paid: false,
            upsellingSent: true
        };
        await session.save();

        // 5. Criar preferência no Mercado Pago
        const paymentUrl = await mercadopago.createExtraPhotosPreference(
            session.organizationId,
            session._id,
            photosCount,
            totalPrice
        );

        res.json({ success: true, paymentUrl });

    } catch (error) {
        console.error('Erro ao criar pagamento de extras:', error);
        res.status(500).json({ error: 'Erro interno ao processar pagamento' });
    }
});

module.exports = router;
