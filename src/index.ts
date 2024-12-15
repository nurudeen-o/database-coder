// src/index.ts
import DatabaseDesignAutomation from './app';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create an instance of the DatabaseDesignAutomation
const app = new DatabaseDesignAutomation();

// Start the server
const PORT = Number(process.env.PORT) || 3000;
app.start(PORT);