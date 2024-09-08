const express = require('express');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware to authenticate user
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'No token provided' });
    }

    const actualToken = token.split(' ')[1];
    jwt.verify(actualToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Error verifying token:', err);
            return res.status(401).json({ message: 'Failed to authenticate token' });
        }
        req.userId = decoded.id;
        next();
    });
};

// Fetch all transactions for the user
router.get('/', authenticate, async (req, res) => {
    try {
        const results = await Transaction.getAllByUserId(req.userId);
        res.json(results);
    } catch (err) {
        console.error('Error fetching transactions:', err.message);
        return res.status(500).json({ message: 'Failed to fetch transactions' });
    }
});

// Fetch a specific transaction by ID
router.get('/:id', authenticate, async (req, res) => {
    const transactionId = req.params.id;

    try {
        const result = await Transaction.getById(req.userId, transactionId);
        if (!result) {  // Changed from result.length === 0
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(result);
    } catch (err) {
        console.error('Error fetching transaction details:', err.message);
        return res.status(500).json({ message: 'Failed to fetch transaction details' });
    }
});

// Add a new transaction
router.post('/',
    authenticate,
    [
        body('type_of_transaction').notEmpty().withMessage('Type of transaction is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('amount').isNumeric().withMessage('Amount must be a number'),
        body('transaction_date').isISO8601().withMessage('Invalid transaction date'),
        body('mode_of_payment').notEmpty().withMessage('Mode of payment is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type_of_transaction, description, amount, transaction_date, mode_of_payment } = req.body;

        const newTransaction = {
            user_id: req.userId,
            type_of_transaction,
            description,
            amount,
            transaction_date,
            mode_of_payment
        };

        try {
            const result = await Transaction.create(newTransaction);
            res.status(201).json({ message: 'Transaction added successfully', transaction: result });
        } catch (err) {
            console.error('Error adding transaction:', err.message);
            return res.status(500).json({ message: 'Failed to add transaction' });
        }
    });

// Delete a transaction
router.delete('/:id', authenticate, async (req, res) => {
    const transactionId = req.params.id;

    try {
        await Transaction.deleteById(req.userId, transactionId);
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error('Error deleting transaction:', err.message);
        return res.status(500).json({ message: 'Failed to delete transaction' });
    }
});

// Update a transaction
router.put('/:id',
    authenticate,
    [
        body('type_of_transaction').notEmpty().withMessage('Type of transaction is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('amount').isNumeric().withMessage('Amount must be a number'),
        body('transaction_date').isISO8601().withMessage('Invalid transaction date'),
        body('mode_of_payment').notEmpty().withMessage('Mode of payment is required')
    ],
    async (req, res) => {
        const transactionId = req.params.id;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type_of_transaction, description, amount, transaction_date, mode_of_payment } = req.body;

        const updatedTransaction = {
            type_of_transaction,
            description,
            amount,
            transaction_date,
            mode_of_payment
        };

        try {
            const result = await Transaction.updateById(req.userId, transactionId, updatedTransaction);
            if (!result) {  // Changed from if (!result)
                return res.status(404).json({ message: 'Transaction not found' });
            }
            res.json({ message: 'Transaction updated successfully', transaction: result });
        } catch (err) {
            console.error('Error updating transaction:', err.message);
            return res.status(500).json({ message: 'Failed to update transaction' });
        }
    }
);

module.exports = router;
