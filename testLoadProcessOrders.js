const dotenv = require('dotenv');
const path = require('path');
const { loadAllProcessOrders } = require('./services/processOrderService');  // Import der Methode

dotenv.config({ path: path.resolve(__dirname, '.env.development') });  // Laden der Umgebungsvariablen

// Testaufruf der Methode
async function testLoadProcessOrders() {
    try {
        const orders = await loadAllProcessOrders();  // Hier wird loadAllProcessOrders aufgerufen
        console.log('Process Orders:', JSON.stringify(orders, null, 2));  // Ausgabe der Prozessaufträge
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLoadProcessOrders();  // Funktion ausführen
