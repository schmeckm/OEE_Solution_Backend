const express = require('express');
const bcrypt = require('bcrypt');
const { loadUsers, saveUsers } = require('../services/userService');
const { errorLogger } = require('../utils/logger');
const { check, validationResult } = require('express-validator');

const { authenticateToken, authorizeRole } = require('../middlewares/auth');

const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for managing users
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     description: Retrieve a list of all users.
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', (req, res) => {
    try {
        const users = loadUsers(); // Load all users
        res.json(users); // Send them as a response
    } catch (error) {
        errorLogger.error(`Error in /users endpoint: ${error.message}`);
        res.status(500).send(error.message);
    }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a specific user
 *     tags: [Users]
 *     description: Retrieve a single user by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: A user object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: User not found.
 */
router.get('/:id', (req, res) => {
    try {
        const users = loadUsers(); // Load all users
        const user = users.find(u => u.id === parseInt(req.params.id)); // Find the user by ID
        if (user) {
            res.json(user); // Send the user as a response
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        errorLogger.error(`Error in /users/${req.params.id} get endpoint: ${error.message}`);
        res.status(500).send(error.message);
    }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     description: Create a new user and save it to the list.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 */
router.post('/', async(req, res) => {
    console.log('Received data:', req.body);

    const { salutation, firstName, username, email, password, role } = req.body;

    try {
        const users = loadUsers(); // Load all users from the JSON

        // Check if a user with the same email already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(200).json({ message: 'Email already exists' });
        }

        // Hash the password if provided (only if it's not null or undefined)
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Create the new user object with optional fields
        const newUser = {
            id: users.length ? Math.max(...users.map(user => user.id)) + 1 : 1,
            salutation: salutation || null, // Optional
            firstName: firstName || null, // Optional
            username,
            email,
            password: hashedPassword, // Optional if null
            role: role || 'user', // Default to 'user' if not provided
        };

        // Save the new user to the array
        users.push(newUser);
        saveUsers(users); // Save the updated users array to the JSON file

        // Send a success response
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error in /users POST endpoint:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});




/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [Users]
 *     description: Update the details of an existing user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       404:
 *         description: User not found.
 */
router.put('/:id', async(req, res) => {
    try {
        const users = loadUsers(); // Load current users
        const id = parseInt(req.params.id);
        const { username, password, role } = req.body;
        const index = users.findIndex(user => user.id === id);

        if (index !== -1) {
            // Update the user's data
            const updatedUser = {
                ...users[index],
                username: username || users[index].username,
                password: password ? await bcrypt.hash(password, 10) : users[index].password,
                role: role || users[index].role
            };
            users[index] = updatedUser;
            saveUsers(users); // Save the updated list of users
            res.json({ message: 'User updated successfully', user: updatedUser });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        errorLogger.error(`Error in /users/${req.params.id} put endpoint: ${error.message}`);
        res.status(500).send(error.message);
    }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     description: Delete a specific user by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       404:
 *         description: User not found.
 */
router.delete('/:id', (req, res) => {
    try {
        let users = loadUsers(); // Load current users
        const id = parseInt(req.params.id);
        const initialLength = users.length;
        users = users.filter(user => user.id !== id); // Filter out the user to delete

        if (users.length === initialLength) {
            return res.status(404).json({ message: 'User not found' });
        }

        saveUsers(users); // Save the updated list of users
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        errorLogger.error(`Error in /users/${req.params.id} delete endpoint: ${error.message}`);
        res.status(500).send(error.message);
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     description: Authenticate a user and return a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in and returned JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Invalid username or password.
 */
router.post("/login", async(req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();

    // Find the user
    const user = users.find((user) => user.username === username);
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    // Verify the password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ message: "Invalid password" });
    }

    // Generate a JWT token
    const accessToken = jwt.sign({ id: user.id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" }
    );

    res.json({ accessToken });
});

/**
 * @swagger
 * /users/email/{email}:
 *   get:
 *     summary: Get a specific user by email
 *     tags: [Users]
 *     description: Retrieve a single user by email.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: The user email.
 *     responses:
 *       200:
 *         description: A user object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: User not found.
 */
router.get('/email/:email', (req, res) => {
    const email = req.params.email;
    const users = loadUsers(); // Load all users
    const user = users.find(u => u.email === email); // Find the user by email

    if (user) {
        return res.json(user); // Send the user as a response
    } else {
        return res.status(404).json({ message: 'User not found' }); // User not found
    }
});


module.exports = router;