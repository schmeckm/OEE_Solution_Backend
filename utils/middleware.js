/**
 * Middleware to validate the OEE data in the request body.
 * Ensures all necessary fields are present and correctly formatted.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
function validateOEEData(req, res, next) {
    // Destructure the expected fields from the request body
    const {
        plannedProductionQuantity,
        Runtime,
        actualPerformance,
        targetPerformance,
        ActualProductionYield,
        ActualProductionQuantity,
    } = req.body;

    // Check if any of the required fields are missing or falsy
    if (!plannedProductionQuantity ||
        !Runtime ||
        !actualPerformance ||
        !targetPerformance ||
        !ActualProductionYield ||
        !ActualProductionQuantity
    ) {
        return res.status(400).json({ message: "Invalid data format" }); // Return a 400 error if validation fails
    }

    next(); // If validation passes, proceed to the next middleware or route handler
}

/**
 * Middleware to handle errors.
 * Logs the error stack to the console and sends a 500 response with the error message.
 *
 * @param {Object} err - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
function handleErrors(err, req, res, next) {
    console.error(err.stack); // Log the error stack to the console
    res
        .status(500)
        .json({ message: "Internal server error", error: err.message }); // Send a 500 response with the error message
}

// Export the middleware functions for use in other files
module.exports = { validateOEEData, handleErrors };