const express = require("express");
const {
    loadUnplannedDowntime,
    saveUnplannedDowntime,
    getUnplannedDowntimeByProcessOrderNumber,
    getUnplannedDowntimeByMachineId,
} = require("../services/unplannedDowntimeService");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Utility function to calculate duration in minutes
function calculateDurationInMinutes(start, end) {
    const startTime = moment(start);
    const endTime = moment(end);
    return endTime.diff(startTime, "minutes");
}

// Data validation utility
function validateDowntime(downtime) {
    const requiredFields = ["Start", "End", "ProcessOrderNumber", "machine_id"];
    requiredFields.forEach((field) => {
        if (!downtime[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    });
}

// Error handling utility
const errorHandler = (res, error, message) => {
    console.error(error);
    res.status(500).json({ message });
};

// === GET: All Unplanned Downtimes ===
router.get("/", async (req, res) => {
    try {
        let data = await loadUnplannedDowntime();
        data = data.map((downtime) => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
        }));
        res.json(data);
    } catch (error) {
        errorHandler(res, error, "Error loading unplanned downtimes");
    }
});

// === GET: Unplanned Downtime by Process Order Number ===
router.get("/processorder/:processOrderNumber", async (req, res) => {
    try {
        const processOrderNumber = req.params.processOrderNumber;
        const data = await getUnplannedDowntimeByProcessOrderNumber(processOrderNumber);

        if (data.length > 0) {
            const enrichedData = data.map((downtime) => ({
                ...downtime,
                durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
            }));
            res.json(enrichedData);
        } else {
            res.status(404).json({ message: "No unplanned downtime found for the specified process order number" });
        }
    } catch (error) {
        errorHandler(res, error, "Error loading unplanned downtimes");
    }
});

// === GET: Unplanned Downtime by Machine ID ===
router.get("/machine/:machineId", async (req, res) => {
    try {
        const machineId = req.params.machineId;
        const data = await getUnplannedDowntimeByMachineId(machineId);

        if (data.length > 0) {
            const enrichedData = data.map((downtime) => ({
                ...downtime,
                durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
            }));
            res.json(enrichedData);
        } else {
            res.status(404).json({ message: "No unplanned downtime found for the specified machine ID" });
        }
    } catch (error) {
        errorHandler(res, error, "Error loading unplanned downtimes");
    }
});

// === GET: Unplanned Downtime by ID ===
router.get("/:id", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ message: "Invalid ID provided" });
        }

        const downtime = data.find((d) => d.ID && d.ID.toString() === id.toString());
        if (downtime) {
            const downtimeWithDuration = {
                ...downtime,
                durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
            };
            res.json(downtimeWithDuration);
        } else {
            res.status(404).json({ message: "Unplanned downtime not found" });
        }
    } catch (error) {
        errorHandler(res, error, "Error loading unplanned downtime");
    }
});

// === POST: Add New Unplanned Downtime ===
router.post("/", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const newData = { ...req.body, ID: uuidv4() }; // Generate a unique ID
        validateDowntime(newData); // Validate input data
        data.push(newData);
        await saveUnplannedDowntime(data);
        res.status(201).json({ message: "Unplanned downtime added successfully", ID: newData.ID });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// === PUT: Update Unplanned Downtime ===
router.put("/:order_id", async (req, res) => {
  try {
      const data = await loadUnplannedDowntime(); // Lade bestehende Daten
      const orderId = parseInt(req.params.order_id, 10); // Konvertiere die order_id in eine Zahl

      if (!orderId) {
          return res.status(400).json({ message: "Invalid order_id provided" });
      }

      // Finde den Index des Eintrags basierend auf order_id
      const index = data.findIndex((item) => item.order_id === orderId);

      if (index !== -1) {
          // Ersetze den gesamten Datensatz
          const newEntry = { ...req.body, order_id: orderId }; // Behalte die `order_id` aus der URL
          // Optional: Validierung für die erforderlichen Felder
          if (!newEntry.ProcessOrderNumber || !newEntry.Start || !newEntry.End || !newEntry.machine_id) {
              return res.status(400).json({ message: "Missing required fields in request body" });
          }

          data[index] = newEntry; // Aktualisiere den Eintrag
          await saveUnplannedDowntime(data); // Speichere die aktualisierten Daten
          res.status(200).json({
              message: "Unplanned downtime updated successfully",
              updatedEntry: newEntry,
          });
      } else {
          res.status(404).json({ message: "Unplanned downtime not found" });
      }
  } catch (error) {
      res.status(500).json({
          message: "Error updating unplanned downtime",
          error: error.message,
      });
  }
});


// === DELETE: Delete Unplanned Downtime ===
router.delete("/:id", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ message: "Invalid ID provided" });
        }

        const filteredData = data.filter((item) => item.ID && item.ID.toString() !== id.toString());

        if (filteredData.length < data.length) {
            await saveUnplannedDowntime(filteredData);
            res.status(200).json({ message: "Unplanned downtime deleted successfully" });
        } else {
            res.status(404).json({ message: "Unplanned downtime not found" });
        }
    } catch (error) {
        errorHandler(res, error, "Error deleting unplanned downtime");
    }
});

module.exports = router;
