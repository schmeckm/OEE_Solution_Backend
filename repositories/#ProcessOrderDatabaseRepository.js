// repositories/ProcessOrderDatabaseRepository.js

const ProcessOrder = require('../models/ProcessOrder');

class ProcessOrderDatabaseRepository {
    constructor() {
        // Konstruktorlogik, falls erforderlich
    }

    async createProcessOrder(data) {
        try {
            const processOrder = await ProcessOrder.create(data);
            return processOrder;
        } catch (error) {
            throw error;
        }
    }

    // Weitere CRUD-Methoden hinzufügen
}

module.exports = new ProcessOrderDatabaseRepository();
