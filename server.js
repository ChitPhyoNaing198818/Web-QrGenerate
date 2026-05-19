const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// --- Content Security Policy (CSP) ပြင်ဆင်ချက် ---
// FontAwesome နှင့် Blob image preview များအဆင်ပြေစေရန် font-src နှင့် blob: ကိုပေါင်းထည့်ထားပါသည်
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://res.cloudinary.com; connect-src 'self' https://api.cloudinary.com https://web-qrgenerate.onrender.com;"
    );
    next();
});



// MongoDB နှင့် Cloudinary configs
const MONGO_URI = "mongodb+srv://maungmaunglwin004_db_user:GjDGNOauVTy5OLok@alace.sywubyd.mongodb.net/?retryWrites=true&w=majority&appName=Alace";

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// 🛠️ FIX 1: Defined data as Mixed type to guarantee MongoDB accepts customized data arrays & mutations
const CardSchema = new mongoose.Schema({ 
    id: String, 
    data: mongoose.Schema.Types.Mixed 
}, { minimize: false });
const Card = mongoose.model('Card', CardSchema);

cloudinary.config({
  cloud_name: "dltggapvz",
  api_key: "753576664531814",
  api_secret: "ZR-_VdsL_ZqBliWo21AcS0eMWts"
});

const upload = multer({ storage: multer.memoryStorage() });

// Routes ပြင်ဆင်ချက်: upload.any() ကိုသုံးပြီး Form fields ပုံစံမျိုးစုံကို dynamic ဖြစ်အောင်လက်ခံထားပါသည်
app.post('/api/generate-card', upload.any(), async (req, res) => {
    try {
        const payloadData = JSON.parse(req.body.payload || '{}');

        // လက်ခံရရှိသော ပုံဖိုင်များကို Cloudinary ပေါ်တင်ပြီး သက်ဆိုင်ရာ Field ID အလိုက် သိမ်းဆည်းခြင်း
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const b64 = Buffer.from(file.buffer).toString("base64");
                const dataURI = "data:" + file.mimetype + ";base64," + b64;
                const result = await cloudinary.uploader.upload(dataURI);
                payloadData[file.fieldname] = result.secure_url;
            }
        }

        const cardId = uuidv4().slice(0, 8);
        const templateName = payloadData.templateName || "lovecard";
        payloadData.templateName = templateName;

        await new Card({ id: cardId, data: payloadData }).save();
        
        // လက်ရှိ Server Host Name အတိုင်း URL ကို dynamic ထုတ်ပေးခြင်း (Local ကော Render မှာပါ အလုပ်လုပ်စေရန်)
        const protocol = req.protocol;
        const host = req.get('host');
        res.json({ success: true, url: `${protocol}://${host}/view/${cardId}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/view/:id', async (req, res) => {
    try {
        const card = await Card.findOne({ id: req.params.id });
        if (!card) return res.status(404).send("<h1>Card မတွေ့ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။</h1>");

        const payloadString = Buffer.from(JSON.stringify(card.data)).toString('base64');
        
        // 🛠️ FIX 2: Wrapped the base64 string in encodeURIComponent to prevent URL parser bugs from converting '+' to spaces
        const safePayload = encodeURIComponent(payloadString);
        
        const templateName = card.data.templateName || "lovecard";
        res.redirect(`/${templateName}.html?studio_payload=${safePayload}`);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

// Static files အတွက် (HTML ဖိုင်များ)
app.use(express.static(__dirname));
// --- Port ပြင်ဆင်ချက် ---
// Render ကဲ့သို့ Cloud Hosting များတွင် Error မတက်စေရန် process.env.PORT ကို သုံးရပါမည်
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));