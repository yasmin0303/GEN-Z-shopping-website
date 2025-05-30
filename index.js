const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { Console } = require("console");

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

// Ensure upload directory exists
const uploadDir = "./uploads/images";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// MongoDB Connection
mongoose.connect("mongodb+srv://yasminbanu803:yasmin03032005@cluster1.wmjcd.mongodb.net/mydatabase", {
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => console.log(`Server Running on Port ${port}`));
})
.catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
});

// Default Route
app.get("/", (req, res) => {
    res.send
    ("Welcome to My API! 🚀");
});

// Image Upload Setup
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });
app.use('/images', express.static(uploadDir));

// Image Upload API
app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: 0, message: "No file uploaded" });
    }

    const imageUrl = `http://localhost:${port}/images/${req.file.filename}`;
    console.log("Image Uploaded:", imageUrl);

    res.json({
        success: 1,
        image_url: imageUrl
    });
});

// Product Schema
const Product = mongoose.model("Product", {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    new_price: { type: Number, required: true },
    old_price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    available: { type: Boolean, default: true },
});

// Add Product API
app.post('/addproduct', async (req, res) => {
    try {
        let lastProduct = await Product.findOne().sort({ id: -1 });
        let id = lastProduct ? lastProduct.id + 1 : 1;

        const newProduct = new Product({
            id: id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price
        });

        await newProduct.save();
        console.log("Product Saved:", newProduct);

        res.json({ success: true, name: req.body.name });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Product API
app.delete('/removeproduct/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findOneAndDelete({ id: req.params.id });

        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        console.log(`Product with ID ${req.params.id} removed`);
        res.json({ success: true, message: `Product ${req.params.id} deleted` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User Schema
const Users = mongoose.model('Users', {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    cartData: { type: Object },
    date: { type: Date, default: Date.now }
});

// Signup API (Register New Users)
app.post('/signup', async (req, res) => {
    try {
        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, error: "User already exists" });
        }

        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        const user = new Users({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, 'secret_ecom');

        res.json({ success: true, token, message: "Signup successful!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login API (Authenticate Users)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: "User not found" });
        }

        // Check if the password is correct
        if (user.password !== password) {
            return res.status(400).json({ success: false, error: "Incorrect password" });
        }

        // Generate JWT token for the user
        const token = jwt.sign({ id: user._id }, 'secret_ecom');
        res.json({ success: true, token, message: "Login successful" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// Creating endpoint for new collection data
app.get('/newcollections', async (req, res) => {
    try {
        let products = await Product.find({});
        let newcollection = products.slice(1).slice(-8);
        console.log("New Collection Fetched");
        res.send(newcollection);
    } catch (error) {
        console.error("Error fetching new collection:", error);
        res.status(500).send({ message: "Server error" });
    }
});


//  Get All Products API
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({}, { _id: 0, __v: 0 });
        console.log("All Products Fetched");
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
