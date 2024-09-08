const pool = require('../config/db');  
const bcrypt = require('bcrypt');  

const User = {  
    register: async (username, password) => {  
        const hashedPassword = await bcrypt.hash(password, 12);  // Increased salt rounds  
        try {  
            const [results] = await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);  
            return results;  
        } catch (err) {  
            console.error('Error registering user:', err);  // Log error  
            throw err;  
        }  
    },  

    login: async (username, password) => {  
        try {  
            const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);  
            if (results.length === 0) throw new Error('User not found');  

            const user = results[0];  
            const isPasswordValid = await bcrypt.compare(password, user.password);  
            if (!isPasswordValid) {  
                throw new Error('Invalid password');  
            }  
            return user;  
        } catch (err) {  
            console.error('Error fetching user:', err);  // Log error  
            throw err;  
        }  
    }  
};  

module.exports = User;