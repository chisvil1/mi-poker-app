const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const Hand = require('pokersolver').Hand; 

const app = express();
app.use(cors());
// CRÍTICO: Usamos el middleware express.raw SÓLO para la ruta del webhook,
// porque necesitamos el cuerpo del mensaje en formato RAW para verificar la firma.
app.use('/api/webhook', express.raw({ type: 'application/json' })); 
app.use(express.json()); // El resto de la API usa JSON

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 4000;

// --- CONFIGURACIÓN DE NOWPAYMENTS (¡ATENCIÓN! ESTOS VALORES ESTÁN SINCRONIZADOS) ---
// La aplicación intentará primero leer estas claves de las variables de entorno de Render.
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || 'J7HQREM-K1E4NTH-Q8XBEB0-666X41A';
const IPN_SECRET = process.env.IPN_SECRET || '+0pL34Ehrcu5Iwtvjn5CpFTbTRtcVDPx'; 
const YOUR_PAYOUT_ADDRESS = process.env.PAYOUT_ADDRESS || '0x263332BEC004486b2845186C13228Da60Bf6a93B'; // <-- TU DIRECCIÓN REAL
const NOWPAYMENTS_URL = 'https://api.nowpayments.io/v1';

// --- ESTADO GLOBAL ---
const tables = new Map();
const users = new Map();
const socketIdToUserId = new Map();
const pendingPayments = new Map(); 

// --- UTILIDADES ---
const createDeck = () => { /* ... código de barajado ... */ };
const determineWinners = (table) => { /* ... código de evaluación ... */ return []; }; 
const broadcastState = (tableId) => { /* ... código de broadcast ... */ }; 
const startHand = (tableId) => { /* ... motor de juego ... */ };

// --- API DE PAGOS (CREATE PAYMENT) ---

app.post('/api/create_payment', async (req, res) => {
    const { amount, currency, userId } = req.body;
    
    if (!amount || parseFloat(amount) < 10) return res.status(400).json({ error: 'Monto insuficiente.' });

    try {
        // En un entorno de producción, descomenta esto para llamar a NowPayments:
        /*
        const response = await fetch(`${NOWPAYMENTS_URL}/payment`, {
            method: 'POST',
            headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                price_amount: amount,
                price_currency: 'usd',
                pay_currency: currency.toLowerCase(),
                ipn_callback_url: `https://${req.headers.host}/api/webhook`, 
                order_id: `ORDER_${userId}_${Date.now()}`,
                payout_address: YOUR_PAYOUT_ADDRESS 
            })
        });
        const paymentData = await response.json();
        */

        // --- SIMULACIÓN PARA DEMO (Borrar esto en producción) ---
        const mockPaymentData = {
            payment_id: `pay_${Date.now()}`,
            pay_address: YOUR_PAYOUT_ADDRESS, // Usamos la dirección real en la demo
            pay_amount: (parseFloat(amount) / 65000).toFixed(6), // Ejemplo BTC
            pay_currency: currency.toLowerCase(),
            order_id: `order_${Date.now()}`
        };

        // Simular éxito a los 10 segundos
        setTimeout(() => {
            completePayment(mockPaymentData.payment_id);
        }, 10000);
        // -----------------------------------------------------

        pendingPayments.set(mockPaymentData.payment_id, { userId, amount: parseFloat(amount), status: 'waiting' });
        res.json(mockPaymentData);

    } catch (error) {
        res.status(500).json({ error: 'Error interno o de red.' });
    }
});

// 2. Webhook (El Aviso de la Blockchain con Verificación de Seguridad)
app.post('/api/webhook', (req, res) => {
    const signature = req.headers['x-nowpayments-sig'];
    const bodyString = req.body.toString('utf8'); 

    // 1. Verificar la firma de seguridad (Antifraude)
    const generatedSignature = crypto.createHmac('sha512', IPN_SECRET).update(bodyString).digest('hex');

    if (signature !== generatedSignature) {
        // Si no coinciden, es un intento de fraude
        console.error('ALERTA DE SEGURIDAD: Firma IPN inválida!');
        return res.status(403).send('Firma IPN inválida'); 
    }
    
    // 2. Procesar el pago si la firma es válida
    try {
        const payment = JSON.parse(bodyString);
        const { payment_id, payment_status } = payment;

        if (payment_status === 'finished' || payment_status === 'confirmed') {
            const order = pendingPayments.get(payment_id);

            if (order && order.status === 'waiting') {
                // 3. Acreditar Saldo
                const user = users.get(order.userId);
                if (user) {
                    user.balance += order.amount; // Usamos amount de la orden original ($USD)
                    io.to(user.socketId).emit('payment_success', { newBalance: user.balance, added: order.amount });
                    io.to(user.socketId).emit('balance_update', user.balance);
                }
                pendingPayments.delete(payment_id);
            }
        }
    } catch (e) {
        console.error('Error al parsear el Webhook:', e);
    }

    res.status(200).send('ok');
});

// --- RESTO DE LÓGICA DE PÓKER ---
// ... (Funciones de juego y socket listeners van aquí)

server.listen(PORT, () => console.log(`Server Pro running on port ${PORT}`));