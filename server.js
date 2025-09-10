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
app.use(express.json()); // Para parsear JSON

// ------------------------------
// Configuración de CORS
// ------------------------------
const allowedOrigins = ["https://magicsgames.netlify.app/"];
app.use(cors({
  origin: allowedOrigins
}));

// ------------------------------
// Configuración de PayPal (PRODUCCIÓN)
// ------------------------------
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// LiveEnvironment para producción
const environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);


// ------------------------------
// RUTA GET /
// ------------------------------
// Solo para probar que el backend funciona
app.get("/", (req, res) => {
  res.send("✅ Backend de Magic Games activo!");
});

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
  const { orderID, title, version } = req.body;

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client.execute(request);

    if (capture.result.status === "COMPLETED") {
      // ✅ Pago exitoso → enviamos los enlaces de descarga según versión
      const downloadLinks = {
        pc: "https://drive.google.com/file/d/1zBtUFyjblHuJKYkI__Yqwr3XeKufqCcr/view?usp=sharing",    
        android: "https://drive.google.com/file/d/1-nwAE7bRaD3BPUWuG2WOvPdJT0UcLQsO/view?usp=sharing" 
      };

      // Elegir la versión correspondiente
      const downloadUrl = version === "android" ? downloadLinks.android : downloadLinks.pc;

      res.json({
        success: true,
        title,
        transactionId: capture.result.id,
        downloadUrl,
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

