require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const exchangeRoutes = require('./routes/exchangeRoutes');

const app = express();
app.use(express.json());

app.use('/api/exchanges', exchangeRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.error('MongoDB connection error:', err));
