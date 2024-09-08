const pool = require('../config/db'); // Adjust the path if necessary  

const Transaction = {  
    // Get all transactions for a specific user  
    getAllByUserId: async (userId) => {  
        const query = 'SELECT * FROM transactions WHERE user_id = ?';  
        try {  
            const [results] = await pool.query(query, [userId]);  
            return results;  
        } catch (err) {  
            console.error('Error fetching transactions for user ID:', userId, err.message);  
            throw new Error(`Failed to fetch transactions: ${err.message}`);  
        }  
    },  

    // Get a transaction by ID  
    getById: async (userId, transactionId) => {  
        const query = 'SELECT * FROM transactions WHERE user_id = ? AND id = ?';  
        try {  
            const [results] = await pool.query(query, [userId, transactionId]);  
            if (results.length === 0) {  
                return null;  // Return null if no transaction is found
            }  
            return results[0];  // Return the first transaction
        } catch (err) {  
            console.error('Error fetching transaction by ID for user ID:', userId, 'Transaction ID:', transactionId, err.message);  
            throw new Error(`Failed to fetch transaction: ${err.message}`);  
        }  
    },  

    // Create a new transaction  
    create: async (transaction) => {  
        const { user_id, amount, description, transaction_date, mode_of_payment, type_of_transaction } = transaction;  
        const query = 'INSERT INTO transactions (user_id, amount, description, transaction_date, mode_of_payment, type_of_transaction) VALUES (?, ?, ?, ?, ?, ?)';  
        try {  
            const [results] = await pool.query(query, [user_id, amount, description, transaction_date, mode_of_payment, type_of_transaction]);  
            return { id: results.insertId, ...transaction }; // Return the new transaction with its ID  
        } catch (err) {  
            console.error('Error creating transaction for user ID:', user_id, err.message);  
            throw new Error(`Failed to create transaction: ${err.message}`);  
        }  
    },  

    // Delete a transaction by ID  
    deleteById: async (userId, transactionId) => {  
        const query = 'DELETE FROM transactions WHERE user_id = ? AND id = ?';  
        try {  
            const [results] = await pool.query(query, [userId, transactionId]);  
            if (results.affectedRows === 0) {  
                return false; // Return false if no transaction was deleted  
            }  
            return true; // Return true if a transaction was deleted  
        } catch (err) {  
            console.error('Error deleting transaction for user ID:', userId, 'Transaction ID:', transactionId, err.message);  
            throw new Error(`Failed to delete transaction: ${err.message}`);  
        }  
    },  

    // Update a transaction by ID  
    updateById: async (userId, transactionId, transaction) => {  
        const { type_of_transaction, description, amount, transaction_date, mode_of_payment } = transaction;  
        const query = 'UPDATE transactions SET type_of_transaction = ?, description = ?, amount = ?, transaction_date = ?, mode_of_payment = ? WHERE user_id = ? AND id = ?';  
        try {  
            const [results] = await pool.query(query, [type_of_transaction, description, amount, transaction_date, mode_of_payment, userId, transactionId]);  
            if (results.affectedRows === 0) {  
                return null;  // Return null if no transaction was updated
            }  
            return { id: transactionId, ...transaction }; // Return the updated transaction  
        } catch (err) {  
            console.error('Error updating transaction for user ID:', userId, 'Transaction ID:', transactionId, err.message);  
            throw new Error(`Failed to update transaction: ${err.message}`);  
        }  
    }  
};  

module.exports = Transaction;
