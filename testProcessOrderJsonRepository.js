// testLoadProcessOrders.js

const dotenv = require('dotenv');
const path = require('path');
const { loadAllProcessOrders } = require('./services/processOrderService'); // Korrigierter Import

// Laden der Umgebungsvariablen aus .env.development
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

// Überprüfen, ob DATABASE_URL korrekt geladen wurde
console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);

async function testLoadProcessOrders() {
    try {
        const orders = await loadAllProcessOrders(); // Korrigierter Funktionsaufruf
        console.log('Process Orders:', JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLoadProcessOrders();
