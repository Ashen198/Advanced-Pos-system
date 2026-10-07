// api/index.js
import express from 'express';

const app = express();

app.use(express.json());

// Your routes
app.get('/api/test', (req, res) => {
  res.json({ status: 'API is running!' });
});

// EXPORT FOR ES MODULES (REQUIRED)
export default app;