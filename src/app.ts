import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
// @ts-ignore
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
// @ts-ignore
import cors from 'cors';
// import { HuggingFaceInference } from "langchain/llms/huggingface";
import axios from 'axios';
import { jsonrepair } from 'jsonrepair'

// Configuration and Environment Setup
dotenv.config();

// Input Validation Schema
const DatabaseConfigSchema = z.object({
  connectionString: z.string(),
  transformations: z.record(z.string(), z.object({
    typeCast: z.string().optional(),
    cleaning: z.string().optional(),
    fillValue: z.any().optional()
  })).optional()
});

// Database Connection Model
const DatabaseConfigModel = mongoose.model('DatabaseConfig', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  connectionString: String,
  createdAt: { type: Date, default: Date.now }
}));

class DatabaseDesignAutomation {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    // this.connectDatabase();

  }

  private initializeMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupErrorHandling() {
    this.app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
      });
    });
  }

  private connectDatabase() {
    mongoose.connect(process.env.MONGODB_URI!, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as mongoose.ConnectOptions)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
  }

  private async generateDatabaseDesign(data: any) {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          inputs: `
  You are an expert database designer. Generate a comprehensive database schema in strict JSON format.

Context: ${JSON.stringify(data).slice(0, 1000)}

Request:
Output the database design as a JSON object strictly following this schema:
{
  "tables": [
    {
      "name": "string",
      "columns": [
        {
          "name": "string",
          "type": "string",
          "primaryKey": "boolean",
          "nullable": "boolean"
        }
      ],
      "relationships": [
        {
          "type": "string",
          "targetTable": "string",
          "foreignKey": "string"
        }
      ]
    }
  ],
  "normalizationLevel": "string",
  "recommendedIndexes": [
    {
      "table": "string",
      "columns": ["string"]
    }
  ]
}

 Generate the database design based on the context.
`,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.5,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Extract the JSON response
      const generatedText = response.data[0].generated_text;
      
      // Find JSON within the response using regex
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonrepair(jsonMatch[0]));
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
          return jsonMatch[0];
        }
      }
      
      return generatedText;
    } catch (error) {
      console.error("Hugging Face API Error:", error);
      throw new Error("Failed to generate database design");
    }
  }

  private setupRoutes() {
    // Database Design Generation Endpoint
    this.app.post('/api/generate-design', async (req: Request, res: Response) => {
      try {
        // Validate input
        const validatedConfig = DatabaseConfigSchema.parse(req.body);
        
        // Extract data
        const extractedData = validatedConfig.connectionString;
        
        // Generate design recommendations
        const designRecommendations = await this.generateDatabaseDesign(extractedData);
        
        res.json({
          extractedData,
          designRecommendations
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ 
          error: 'Design generation failed', 
          details: error instanceof Error ? error.message : error 
        });
      }
    });

    // Authentication Endpoint
    this.app.post('/api/login', async (req: Request, res: Response) => {
      const { username, password } = req.body;
      
      const user = true;
      
      if (user) {
        const token = jwt.sign(
          { id: '1234567890', username: username}, 
          process.env.JWT_SECRET!, 
          { expiresIn: '1h' }
        );
        
        res.json({ token, user: { id: '1234567890', username: username } });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  }

  public start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

// Export for use in other files
export default DatabaseDesignAutomation;