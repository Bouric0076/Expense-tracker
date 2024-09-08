const express = require('express');  
const bcrypt = require('bcrypt');  
const jwt = require('jsonwebtoken');  
const crypto = require('crypto');  
const nodemailer = require('nodemailer');  
const router = express.Router();  
const pool = require('../config/db');  
const { body, validationResult } = require('express-validator');  

// Set up Nodemailer transport  
const transporter = nodemailer.createTransport({  
    service: 'gmail',  
    auth: {  
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS,  
    },  
    tls: {  
        rejectUnauthorized: false,  
    },  
});  

// Register new user  
router.post('/register', [  
    body('username').isLength({ min: 5 }).trim().withMessage('Username must be at least 5 characters long'),  
    body('password').isLength({ min: 8 }).trim().withMessage('Password must be at least 8 characters long'),  
    body('email').isEmail().trim().normalizeEmail().withMessage('Invalid email address'),  
], async (req, res) => {  
    const errors = validationResult(req);  
    if (!errors.isEmpty()) {  
        return res.status(400).json({ errors: errors.array() });  
    }  

    const { username, password, email } = req.body;  

    try {  
        const hashedPassword = await bcrypt.hash(password, 12);  
        await pool.query('INSERT INTO users(username, password, email, resetToken, resetTokenExpires) VALUES (?, ?, ?, NULL, NULL)', [username, hashedPassword, email]);  
        res.status(201).json({ message: 'User registered successfully' });  
    } catch (err) {  
        console.error('Error during registration:', err);  
        res.status(500).json({ error: 'Internal server error' });  
    }  
});  

// Login user  
router.post('/login', async (req, res) => {  
    const { username, password } = req.body;  

    try {  
        const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);  
        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });  

        const user = results[0];  
        const match = await bcrypt.compare(password, user.password);  
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });  

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });  
        res.json({ token });  
    } catch (err) {  
        console.error('Error during login:', err);  
        res.status(500).json({ message: 'Internal server error' });  
    }  
});  

// Middleware to verify JWT  
const verifyToken = (req, res, next) => {  
    const token = req.headers['authorization'];  
    if (!token || !token.startsWith('Bearer ')) return res.status(403).json({ message: 'No token provided' });  

    const actualToken = token.split(' ')[1];  

    jwt.verify(actualToken, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {  
        if (err) return res.status(403).json({ message: 'Failed to authenticate token' });  

        req.userId = decoded.id;  
        req.username = decoded.username;  
        next();  
    });  
};  

// Reset password request handler  
router.post('/reset-password', async (req, res) => {  
    const { email } = req.body;  

    try {  
        const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);  
        if (results.length === 0) return res.status(404).json({ message: 'No user found with this email' });  

        const user = results[0];  
        const resetToken = crypto.randomBytes(32).toString('hex');  
        const resetTokenExpires = Date.now() + 3600000; // 1 hour  

        await pool.query('UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE email = ?', [resetToken, resetTokenExpires, email]);  

        const resetLink = `http://localhost:5000/api/auth/reset-password/${resetToken}`;

                // Send the reset email  
                const mailOptions = {  
                    from: process.env.EMAIL_USER,  
                    to: email,  
                    subject: 'Password Reset Request',  
                    html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password.</p>`,  
                };  
        
                await transporter.sendMail(mailOptions);  
                res.json({ message: 'Reset link sent to your email' });  
            } catch (err) {  
                console.error('Error during password reset request:', err);  
                res.status(500).json({ message: 'Internal server error' });  
            }  
        });  
        
        // Password reset form handler (GET request)  
        router.get('/reset-password/:token', async (req, res) => {  
            const { token } = req.params;  
        
            try {  
                const [results] = await pool.query('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?', [token, Date.now()]);  
                if (results.length === 0) {  
                    return res.status(400).send('Password reset token is invalid or has expired.');  
                }  
        
                // Render a password reset form with basic HTML and styling  
                res.send(`  
                    <!DOCTYPE html>  
                    <html lang="en">  
                    <head>  
                        <meta charset="UTF-8">  
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">  
                        <title>Reset Password</title>  
                        <style>  
                            body {  
                                font-family: Arial, sans-serif;  
                                background-color: #f4f4f4;  
                                display: flex;  
                                justify-content: center;  
                                align-items: center;  
                                height: 100vh;  
                            }  
                            .reset-form {  
                                background-color: #fff;  
                                padding: 20px;  
                                border-radius: 8px;  
                                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);  
                                width: 300px;  
                            }  
                            .reset-form h2 {  
                                margin-bottom: 20px;  
                                color: #333;  
                            }  
                            .reset-form input[type="password"],  
                            .reset-form input[type="submit"] {  
                                width: 90%;  
                                padding: 10px;  
                                margin: 10px 0;  
                                border-radius: 5px;  
                                border: 1px solid #ddd;  
                            }  
                            .reset-form input[type="submit"] {  
                                background-color: #28a745;  
                                color: #fff;  
                                cursor: pointer;  
                                border: none;  
                            }  
                            .reset-form input[type="submit"]:hover {  
                                background-color: #218838;  
                            }  
                        </style>  
                    </head>  
                    <body>  
                        <div class="reset-form">  
                            <h2>Reset Your Password</h2>  
                            <form action="/api/auth/reset-password/${token}" method="POST">  
                                <input type="password" name="password" placeholder="Enter new password" required />  
                                <input type="submit" value="Reset Password" />  
                            </form>  
                        </div>  
                    </body>  
                    </html>  
                `);  
            } catch (err) {  
                console.error('Error during password reset:', err);  
                res.status(500).send('Internal server error');  
            }  
        });  
        
        // Password reset form handler (POST request)  
        // Password reset form handler (POST request)  
router.post('/reset-password/:token', async (req, res) => {  
    const { token } = req.params;  
    const { password } = req.body;  

    try {  
        const [results] = await pool.query('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?', [token, Date.now()]);  
        if (results.length === 0) {  
            return res.status(400).json({ message: 'Invalid or expired reset token' });  
        }  

        const user = results[0];  
        const hashedPassword = await bcrypt.hash(password, 12);  

        await pool.query('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE resetToken = ?', [hashedPassword, token]);  

        // Redirect to login page with success message in query parameters  
        res.redirect(`/login.html?message=password_reset_success`);  
    } catch (err) {  
        console.error('Error during password reset:', err);  
        res.status(500).json({ message: 'Internal server error' });  
    }  
   });
        
module.exports = router;