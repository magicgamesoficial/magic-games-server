// ------------------------------
// Importamos librerías necesarias
// ------------------------------
const express = require("express"); 
const cors = require("cors");       
const paypal = require("@paypal/checkout-server-sdk");
require("dotenv").config();         

// ------------------------------
// Inicializamos la app
// ------------------------------
const app = express();
app.use(cors());
app.use(express.json()); 

// ------------------------------
// Configuración de PayPal (PRODUCCIÓN)
// ------------------------------
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// ⚠️ Ahora usamos LiveEnvironment en vez de Sandbox
const environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// ------------------------------
// RUTA 1: Crear una orden en PayPal
// ------------------------------
app.post("/create-order", async (req, res) => {
  const { title, price } = req.body;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: price },
        description: title,
      },
    ],
  });

  try {
    const order = await client.execute(request);
    res.json({ orderID: order.result.id });
  } catch (err) {
    console.error("❌ Error creando orden:", err);
    res.status(500).json({ error: "Error creando orden" });
  }
});

// ------------------------------
// RUTA 2: Capturar la orden
// ------------------------------
app.post("/capture-order", async (req, res) => {
  const { orderID, title } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client.execute(request);

    if (capture.result.status === "COMPLETED") {
      // ✅ Pago exitoso → enviamos los enlaces de descarga
      const downloadLinks = {
        pc: "https://magicsgames.netlify.app/html/inicio/descargas/FRUTO_PROHIBIDO.exe",    
        android: "https://magicsgames.netlify.app/html/inicio/descargas/FRUTO_PROHIBIDO.apk" 
      };

      res.json({
        success: true,
        title,
        transactionId: capture.result.id,
        downloadLinks,
      });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("❌ Error capturando orden:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Iniciar servidor
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor en PRODUCCIÓN escuchando en http://localhost:${PORT}`);
});
