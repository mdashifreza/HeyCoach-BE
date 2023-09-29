const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const port = 8897;
const app = express();

// Use cors middleware
app.use(cors());
// Parse request body
app.use(express.json());

// Create a MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root@123',
    database: 'restaurant_db'
});

// Handle MySQL connection errors
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        throw err;
    }
    console.log('Connected to MySQL');

    // Create the 'restaurants' table if it doesn't exist
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS restaurants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address VARCHAR(255) NOT NULL,
            contact VARCHAR(255) NOT NULL
        )
    `;

    connection.query(createTableQuery, (createTableErr) => {
        if (createTableErr) {
            console.error('Error creating table:', createTableErr);
            throw createTableErr;
        }
        console.log('Table created or already exists');
    });
});

// Routes
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

router.post('/restaurants', (req, res) => {
    const { name, address, contact } = req.body;

    const sql = 'INSERT INTO restaurants (name, address, contact) VALUES (?, ?, ?)';
    const values = [name, address, contact];

    connection.query(sql, values, (error, results) => {
        if (error) throw error;
        res.json({ message: 'Restaurant added successfully', id: results.insertId });
    });
});

//get all restaurants
router.get('/restaurants', (req, res) => {
    const { search, page = 1, pageSize = 10 } = req.query;
    let sql = 'SELECT COUNT(*) as total FROM restaurants';

    const searchConditions = [];
    const searchValues = [];

    if (search) {
        searchConditions.push('name LIKE ? OR address LIKE ? OR contact LIKE ?');
        searchValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (searchConditions.length > 0) {
        sql += ` WHERE ${searchConditions.join(' OR ')}`;
    }

    connection.query(sql, searchValues, (countError, countResults) => {
        if (countError) {
            console.error('Error counting records:', countError);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const totalRecords = countResults[0].total;
        const totalPages = Math.ceil(totalRecords / pageSize);
        const startIndex = (page - 1) * pageSize;

        sql = 'SELECT * FROM restaurants';

        if (searchConditions.length > 0) {
            sql += ` WHERE ${searchConditions.join(' OR ')}`;
        }

        sql += ` LIMIT ?, ?`;

        const values = searchValues.concat([startIndex, pageSize]);

        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error('Error fetching records:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.json({
                results,
                total_pages: totalPages,
                current_page: parseInt(page),
            });
        });
    });
});


// New route to update a restaurant
router.put('/restaurants/:id', (req, res) => {
    const { id } = req.params;
    const { name, address, contact } = req.body;

    const sql = 'UPDATE restaurants SET name = ?, address = ?, contact = ? WHERE id = ?';
    const values = [name, address, contact, id];

    connection.query(sql, values, (error) => {
        if (error) throw error;
        res.json({ message: 'Restaurant updated successfully' });
    });
});

// New route to delete a restaurant
router.delete('/restaurants/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM restaurants WHERE id = ?';
    const values = [id];

    connection.query(sql, values, (error) => {
        if (error) throw error;
        res.json({ message: 'Restaurant deleted successfully' });
    });
});

app.use('/api', router);

// Start the server
app.listen(port, () => {
    console.log('Server is listening at port:', port);
});
