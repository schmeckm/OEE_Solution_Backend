const express = require('express');
const ratingsRouter = require('./routes/rating');

const app = express();

app.use(express.json());

// Other routers
app.use('/api/v1/ratings', ratingsRouter);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});