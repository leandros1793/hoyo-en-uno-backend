const express = require('express');
const path = require('path');
const config = require('./config');
const paymentRouter = require('./routes/payment.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true");

    // Manejo de la petición OPTIONS (preflight)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    next();
});

// Configurar rutas de la API
app.use('/payment', paymentRouter);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Hoyo en Uno - Servicio de pagos');
});

// Iniciar servidor
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    // Configurar Mercado Pago
    config.configureMercadoPago();
});