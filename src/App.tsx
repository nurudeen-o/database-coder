import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
// @ts-ignore
import Mermaid from 'react-mermaid2';
import './index.css';

// Spinner Component
const Spinner: React.FC = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const DatabaseDesignApp: React.FC = () => {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Loading States
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);

  // Refs for all input fields to reduce unnecessary re-renders
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const sourceTypeRef = useRef<HTMLSelectElement>(null);
  const connectionStringRef = useRef<HTMLInputElement>(null);

  // Design Generation State
  const [designResult, setDesignResult] = useState<string | null>(null);
  const [databaseSchema, setDatabaseSchema] = useState<string | null>(null);

  // Login Handler
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    // Reset previous error and set loading state
    setError(null);
    setIsLoggingIn(true);

    try {
      const response = await axios.post('http://localhost:3000/api/login', {
        username,
        password
      });

      // Store token and update login state
      setToken(response.data.token);
      setIsLoggedIn(true);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      setIsLoggedIn(false);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // Design Generation Handler
  const handleGenerateDesign = useCallback(async () => {
    const sourceType = sourceTypeRef.current?.value || '';
    const connectionString = connectionStringRef.current?.value || '';

    // Reset previous error and set loading state
    setError(null);
    setIsGeneratingDesign(true);

    try {
      const response = await axios.post(
        'http://localhost:3000/api/generate-design', 
        {
          sourceType,
          connectionString,
          sourceConfig: {
            path: sourceType === 'csv' ? connectionString : undefined,
            url: sourceType === 'api' ? connectionString : undefined
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const designData = response.data;
      setDesignResult(JSON.stringify(designData, null, 2));
      
      // Generate Mermaid ERD
      const mermaidSchema = generateMermaidERD(designData);
      console.log(mermaidSchema);
      setDatabaseSchema(mermaidSchema);
    } catch (err) {
      setError('Failed to generate database design.');
      console.error(err);
    } finally {
      setIsGeneratingDesign(false);
    }
  }, [token]);

  // Generate Mermaid ERD from Design Result (unchanged)
  const generateMermaidERD = useCallback((designData: any): string => {
    let mermaidCode = 'erDiagram\n';

    // Add tables
    designData.designRecommendations.tables.forEach((table: any) => {
      mermaidCode += `    ${table.name} {\n`;
      
      // Add columns
      table.columns.forEach((column: any) => {
        const nullable = column.nullable ? '' : '';
        mermaidCode += `        ${column.type} ${column.name}${nullable}\n`;
      });
      
      mermaidCode += `    }\n`;
    });

    // Add relationships
    designData.designRecommendations.tables.forEach((table: any) => {
      if (table.relationships) {
        table.relationships.forEach((relationship: any) => {
          mermaidCode += `    ${relationship.targetTable} }o--|| ${table.name} : relates\n`;
        });
      }
    });

    return mermaidCode;
  }, []);

  // Logout Handler
  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setToken('');
    setDesignResult(null);
    setDatabaseSchema(null);
    
    // Reset all input refs
    if (usernameRef.current) usernameRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    if (sourceTypeRef.current) sourceTypeRef.current.value = '';
    if (connectionStringRef.current) connectionStringRef.current.value = '';
  }, []);

  // Login Form Component
  const LoginForm = React.memo(() => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Database Design Automation
      </h2>
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm text-center"
          >
            {error}
          </motion.p>
        )}
        <input 
          ref={usernameRef}
          type="text" 
          placeholder="Username" 
          required
          disabled={isLoggingIn}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <input 
          ref={passwordRef}
          type="password" 
          placeholder="Password" 
          required
          disabled={isLoggingIn}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isLoggingIn}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {isLoggingIn ? <Spinner /> : 'Login'}
        </button>
      </form>
    </motion.div>
  ));

  // Design Generation Interface
  const DesignInterface = React.memo(() => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Generate Database Design
      </h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Source Type</label>
          <select 
            ref={sourceTypeRef}
            defaultValue=""
            disabled={isGeneratingDesign}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select Source Type</option>
            <option value="csv">CSV File</option>
            <option value="api">API</option>
            <option value="prompt">Prompt</option>
            <option value="database">Database</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Connection/Source String/Prompt
          </label>
          <input 
            ref={connectionStringRef}
            placeholder="Enter connection string or file path"
            disabled={isGeneratingDesign}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <button 
          onClick={handleGenerateDesign} 
          disabled={isGeneratingDesign}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {isGeneratingDesign ? <Spinner /> : 'Generate Database Design'}
        </button>

        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {isGeneratingDesign && (
          <div className="flex justify-center items-center mt-4">
            <Spinner />
          </div>
        )}

        {designResult && !isGeneratingDesign && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {databaseSchema && (
              <div>
                <h3 className="font-bold mb-2 text-gray-700">Database Schema Visualization:</h3>
                <div className="w-full border border-gray-300 rounded-md p-4 overflow-x-auto">
                  <Mermaid 
                    chart={databaseSchema} 
                    className="w-full content-center"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        <button 
          onClick={handleLogout} 
          disabled={isGeneratingDesign}
          className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors mt-4 disabled:opacity-50"
        >
          Logout
        </button>
      </div>
    </motion.div>
  ));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? <LoginForm key="login" /> : <DesignInterface key="design" />}
      </AnimatePresence>
    </div>
  );
};

export default DatabaseDesignApp;