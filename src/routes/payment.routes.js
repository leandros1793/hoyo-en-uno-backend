const { Router } = require('express');
const { 
    createPreference, 
    successPayment, 
    failurePayment, 
    pendingPayment 
} = require('../controllers/payment.controller');

const router = Router();

// Ruta para crear una preferencia de pago
router.post('/create_preference', createPreference);

// Rutas de redirección después del pago
router.get('/success', successPayment);
router.get('/failure', failurePayment);
router.get('/pending', pendingPayment);

module.exports = router;
