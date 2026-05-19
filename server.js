const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// CSP Headers ထည့်သွင်းခြင်း
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://api.cloudinary.com https://web-qrgenerate.onrender.com;"
    );
    next();
});

// 1. MongoDB တိုက်ရိုက်ချိတ်ဆက်ခြင်း
const MONGO_URI = "mongodb+srv://maungmaunglwin004_db_user:GjDGNOauVTy5OLok@alace.sywubyd.mongodb.net/?retryWrites=true&w=majority&appName=Alace";

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));

const CardSchema = new mongoose.Schema({ id: String, data: Object });
const Card = mongoose.model('Card', CardSchema);

// 2. Cloudinary တိုက်ရိုက်ချိတ်ဆက်ခြင်း
cloudinary.config({
  cloud_name: "dltggapvz",
  api_key: "753576664531814",
  api_secret: "*********************************"
  
});

const upload = multer({ storage: multer.memoryStorage() });

// 3. API - ပုံနှင့် Data လက်ခံခြင်း
app.post('/api/generate-card', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI);
            imageUrl = result.secure_url;
        }

        const cardId = uuidv4().slice(0, 8);
        const payloadData = JSON.parse(req.body.payload || '{}');
        if (imageUrl) payloadData.img1 = imageUrl;

        // MongoDB ထဲသို့ သိမ်းဆည်းခြင်း
        await new Card({ id: cardId, data: payloadData }).save();

        res.json({ success: true, url: `https://web-qrgenerate.onrender.com/view/${cardId}` });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. API - QR Scan ဖတ်လျှင် Redirect လုပ်ခြင်း
app.get('/view/:id', async (req, res) => {
    try {
        const card = await Card.findOne({ id: req.params.id });
        if (!card) return res.status(404).send("<h1>Card မတွေ့ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။</h1>");

        const payloadString = Buffer.from(JSON.stringify(card.data)).toString('base64');
        const templateName = card.data.templateName || "lovecard";
        res.redirect(`/${templateName}.html?studio_payload=${payloadString}`);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));