const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

// --- အရေးကြီး: သင်၏ Cloudinary API Keys များကို ထည့်ပါ ---
// https://cloudinary.com တွင် Free အကောင့်ဖွင့်ပြီး ယူနိုင်ပါသည်။
cloudinary.config({
  cloud_name: 'dltggapvz',
  api_key: '853959617686651',
  api_secret: '**********'
});

// ပုံတွေကို လက်ခံရန် ယာယီ Storage သတ်မှတ်ခြင်း
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database အစားထိုး ယာယီ မှတ်ဉာဏ် (တကယ့်အပြင်မှာ MongoDB သုံးရန် အကြံပြုပါသည်)
const db = {};

// Static ဖိုင်များ (HTML များကို) ဖွင့်ပေးရန် (သင့် HTML ဖိုင်များရှိသော Folder ကို ညွှန်းပါ)
app.use(express.static('public')); // 'public' folder ထဲတွင် သင်၏ html များကို ထည့်ထားပါ

// 1. Frontend မှ Data နှင့် ပုံကို လက်ခံမည့် API
app.post('/api/generate-card', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';
        
        // ပုံပါလာခဲ့လျှင် Cloudinary သို့ တင်မည်
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, { resource_type: "auto" });
            imageUrl = result.secure_url; // အင်တာနက်ပေါ်မှ ပုံ Link အစစ် ရပြီ
        }

        const cardId = uuidv4().slice(0, 8); // ID အတိုလေး ဖန်တီးမည်
        
        // Frontend မှ ပို့လိုက်သော JSON Data များကို ယူမည်
        const payloadData = JSON.parse(req.body.payload || '{}');
        
        // Cloudinary မှရသော ပုံ Link ကို Data ထဲပေါင်းထည့်မည်
        if (imageUrl) payloadData.img1 = imageUrl; 

        // Database ထဲ သိမ်းမည်
        db[cardId] = payloadData;

        // QR Code ဆွဲရန် Link အတို ပြန်ပို့ပေးမည် (Deploy လုပ်လျှင် localhost နေရာတွင် Domain ပြောင်းပါ)
        const shortUrl = `http://localhost:3000/view/${cardId}`;
        res.json({ success: true, url: shortUrl });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. QR ကို စကင်ဖတ်လျှင် သက်ဆိုင်ရာ Template သို့ Redirect လုပ်ပေးမည့် API
app.get('/view/:id', (req, res) => {
    const data = db[req.params.id];
    
    if (!data) {
        return res.status(404).send("<h1>Card မတွေ့ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။</h1>");
    }

    // သင့်မူလ HTML များ နားလည်စေရန် Data ကို Base64 ပြန်ပြောင်းမည်
    const payloadString = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    
    // Template အမည် (ဥပမာ - lovecard, christmas)
    const templateName = data.templateName || "lovecard"; 
    
    // မူလ Template ဆီသို့ Payload တွဲလျက် အလိုအလျောက် ပို့ပေးမည်
    res.redirect(`/${templateName}.html?studio_payload=${payloadString}`);
});

app.listen(3000, () => {
    console.log('Backend server is running on http://localhost:3000');
});