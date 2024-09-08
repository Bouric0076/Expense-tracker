const express = require('express');  
const session = require('express-session');  
const cors = require('cors');  
require('dotenv').config();  
const authRoutes = require('./routes/auth');  
const transactionRoutes = require('./routes/transactions');  
const pool = require('./config/db');  // Centralized DB connection  
const app = express();  
const PORT = process.env.PORT || 5000;  

// Middleware for logging requests  
app.use((req, res, next) => {  
    console.log(`${req.method} ${req.url}`);  
    next();  
});  

// CORS configuration  
const allowedOrigins = [  
    'http://127.0.0.1:55506',  
    'http://localhost:3000',  
];  

app.use(cors({  
    origin: allowedOrigins,  
    credentials: true  
}));  

app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(session({  
    secret: process.env.SESSION_SECRET,  
    resave: false,  
    saveUninitialized: true,  
    cookie: {  
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production  
        httpOnly: true,  
        maxAge: 3600000 // 1 hour  
    }  
}));  

// Route middleware  
app.use('/api/auth', authRoutes);  
app.use('/api/transactions', transactionRoutes);  

// Centralized error handling middleware  
app.use((err, req, res, next) => {  
    console.error(err.stack);  
    res.status(500).json({ message: 'Internal Server Error', error: err.message });  
});  

// Start server  
app.listen(PORT, () => {  
    console.log(`Server is running on http://localhost:${PORT}`);  
});