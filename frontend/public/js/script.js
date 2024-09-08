document.addEventListener('DOMContentLoaded', () => {
    // Ensure user is logged in  
    if (!localStorage.getItem('token')) {
        alert('Please log in to access your transactions.');
        window.location.href = './login.html'; // Redirect to login page  
        return;
    }

    // Logout functionality
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('token'); // Remove token from localStorage
        alert('You have been logged out.');
        window.location.href = './login.html'; // Redirect to login page
    });


    // Handle form submission  
    document.getElementById('transaction-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);
        const transactionData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                throw new Error('Failed to add transaction.');
            }

            const responseData = await response.json();
            document.getElementById('status').textContent = responseData.message || 'Transaction added successfully';
            fetchTransactions();
            document.getElementById('transaction-form').reset(); // Clear the form after adding transaction
        } catch (error) {
            console.error('Error adding transaction:', error);
            document.getElementById('status').textContent = `Error: ${error.message}`;
        }
    });

    // Fetch and display transactions  
    async function fetchTransactions() {
        try {
            const response = await fetch('http://localhost:5000/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch transactions: ${errorText}`);
            }

            const transactions = await response.json();
            updateTransactionTable(transactions);
            updateHeader(transactions);
            updateSpendingChart(transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    }

    // Update transaction table with Edit and Delete buttons  
    function updateTransactionTable(transactions) {
        const tbody = document.getElementById('transactionList');
        tbody.innerHTML = ''; // Clear existing rows

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.description}</td>
                <td>${transaction.amount}</td>
                <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                <td>${transaction.type_of_transaction}</td>
                <td>${transaction.mode_of_payment}</td>
                <td>
                    <button data-id="${transaction.id}" class="edit-button" >Edit</button>
                    <button data-id="${transaction.id}" class="delete-button" >Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for dynamically created buttons  
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => editTransaction(button.dataset.id));
        });
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => deleteTransaction(button.dataset.id));
        });
    }

    // Edit transaction function  
    async function editTransaction(id) {
        try {
            const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch transaction details: ${errorText}`);
            }

            const transaction = await response.json();

            const updatedDescription = prompt("Update Description:", transaction.description);
            const updatedAmount = prompt("Update Amount:", transaction.amount);
            const updatedDate = prompt("Update Date (YYYY-MM-DD):", transaction.transaction_date);
            const updatedType = prompt("Update Type (Income/Expense):", transaction.type_of_transaction);
            const updatedPaymentMode = prompt("Update Payment Mode:", transaction.mode_of_payment);

            // Validate inputs  
            if (!updatedDescription || isNaN(updatedAmount) || !updatedDate || !updatedType || !updatedPaymentMode) {
                alert("Please provide valid inputs for all fields.");
                return;
            }

            const updatedTransaction = {
                description: updatedDescription,
                amount: parseFloat(updatedAmount),
                transaction_date: updatedDate,
                type_of_transaction: updatedType,
                mode_of_payment: updatedPaymentMode
            };

            const updateResponse = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedTransaction)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update transaction: ${errorText}`);
            }

            const updateResponseData = await updateResponse.json();
            alert(updateResponseData.message || 'Transaction updated successfully');
            fetchTransactions(); // Refresh the transaction list  
        } catch (error) {
            console.error('Error editing transaction:', error);
            alert(`Error: ${error.message}`);
        }
    }

    // Delete transaction function  
    async function deleteTransaction(id) {
        if (confirm("Are you sure you want to delete this transaction?")) {
            try {
                const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to delete transaction: ${errorText}`);
                }

                const responseData = await response.json();
                alert(responseData.message || 'Transaction deleted successfully');
                fetchTransactions(); // Refresh the transaction list  
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert(`Error: ${error.message}`);
            }
        }
    }

    // Update header with total balance, income, and expense  
    function updateHeader(transactions) {
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(transaction => {
            if (transaction.type_of_transaction === 'Income') {
                totalIncome += parseFloat(transaction.amount);
            } else {
                totalExpenses += parseFloat(transaction.amount);
            }
        });

        const balance = totalIncome - totalExpenses;
        document.getElementById('income').textContent = `KES ${totalIncome.toFixed(2)}`;
        document.getElementById('expense').textContent = `KES ${totalExpenses.toFixed(2)}`;
        document.getElementById('balance').textContent = `KES ${balance.toFixed(2)}`;
    }

    // Update spending chart  
    const ctx = document.getElementById('spendingChart').getContext('2d');
    let spendingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                label: 'Amount (KES)',
                data: [0, 0], // Initial data for income and expenses  
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Income color  
                    'rgba(255, 99, 132, 0.6)'  // Expenses color  
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    function updateSpendingChart(transactions) {
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(transaction => {
            if (transaction.type_of_transaction === 'Income') {
                totalIncome += parseFloat(transaction.amount);
            } else {
                totalExpenses += parseFloat(transaction.amount);
            }
        });

        spendingChart.data.datasets[0].data = [totalIncome, totalExpenses];
        spendingChart.update();
    }

    fetchTransactions(); // Initial call to fetch transactions on page load  
});
