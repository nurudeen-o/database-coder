/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

// New SQL Utility Functions
const convertType = (mermaidType: string): string => {
  switch (mermaidType.toLowerCase()) {
    case 'integer': return 'INTEGER';
    case 'int': return 'INTEGER';
    case 'string': return 'VARCHAR(255)';
    case 'decimal': return 'DECIMAL(10, 2)';
    case 'float': return 'DECIMAL(10, 2)';
    case 'date': return 'DATE';
    case 'datetime': return 'DATETIME';
    default: return 'TEXT';
  }
};

const parseMermaidER = (mermaidDiagram: string) => {
  const entityRegex = /(\w+)\s+\{\s+([^}]+)\}/g;
  const relationshipRegex = /(\w+)\s+\}o--\|\|\s+(\w+)/g;
  const entities: { [key: string]: any[] } = {};
  const relationships: { source: string, target: string }[] = [];
  
  let match;
  // Extract entities
  while ((match = entityRegex.exec(mermaidDiagram))) {
    const [_, entityName, attributesBlock] = match;
    const attributes = attributesBlock
      .trim()
      .split('\n')
      .map(attr => {
        const [type, name] = attr.trim().split(' ');
        return { name, type };
      });
    entities[entityName] = attributes;
  }
  
  // Extract relationships
  while ((match = relationshipRegex.exec(mermaidDiagram))) {
    const [_, source, target] = match;
    relationships.push({ source, target });
  }
  
  return { entities, relationships };
};

const generateSQL = ({ entities, relationships }: { entities: any, relationships: any }) => {
  let sql = '-- Generated Database Schema\n\n';
  
  // Generate SQL for entities
  for (const [tableName, attributes] of Object.entries(entities)) {
    sql += `CREATE TABLE ${tableName} (\n`;
    // @ts-ignore
    attributes.forEach(({ name, type }: { name: string, type: string }) => {
      const sqlType = convertType(type);
      // Add primary key for ID columns
      const primaryKey = name.toLowerCase() === `${tableName.toLowerCase()}id` ? ' PRIMARY KEY' : '';
      sql += `  ${name} ${sqlType}${primaryKey},\n`;
    });
    sql = sql.slice(0, -2) + '\n);\n\n'; // Remove trailing comma and add closing
  }
  
  // Generate SQL for relationships (foreign keys)
  relationships.forEach(({ source, target }: { source: string, target: string }) => {
    sql += `ALTER TABLE ${source}\n  ADD CONSTRAINT fk_${source}_${target}\n  FOREIGN KEY (${target.toLowerCase()}ID)\n  REFERENCES ${target}(${target.toLowerCase()}ID);\n\n`;
  });
  
  return sql;
};

const DatabaseDesignApp: React.FC = () => {
  // Authentication State
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, _setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Loading States
  // const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);

  // Refs for all input fields to reduce unnecessary re-renders
  // const usernameRef = useRef<HTMLInputElement>(null);
  // const passwordRef = useRef<HTMLInputElement>(null);
  const connectionStringRef = useRef<HTMLInputElement>(null);

  // Design Generation State
  const [designResult, setDesignResult] = useState<string | null>(null);
  const [databaseSchema, setDatabaseSchema] = useState<string | null>(null);
  const [sqlSchema, setSqlSchema] = useState<string | null>(null);

  // Login Handler
  // const handleLogin = useCallback(async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const username = usernameRef.current?.value || '';
  //   const password = passwordRef.current?.value || '';

  //   // Reset previous error and set loading state
  //   setError(null);
  //   setIsLoggingIn(true);

  //   try {
  //     const response = await axios.post('http://localhost:3000/api/login', {
  //       username,
  //       password
  //     });

  //     // Store token and update login state
  //     setToken(response.data.token);
  //     setIsLoggedIn(true);
  //   } catch (err) {
  //     setError('Login failed. Please check your credentials.');
  //     setIsLoggedIn(false);
  //   } finally {
  //     setIsLoggingIn(false);
  //   }
  // }, []);

  
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

  // Design Generation Handler
  const handleGenerateDesign = useCallback(async () => {
    const connectionString = connectionStringRef.current?.value || '';

    // Reset previous error and set loading state
    setError(null);
    setIsGeneratingDesign(true);

    try {
      const response = await axios.post(
        'https://database-coder-production.up.railway.app/api/generate-design', 
        {
          connectionString,
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

      // Parse Mermaid and generate SQL
      const { entities, relationships } = parseMermaidER(mermaidSchema);
      const generatedSql = generateSQL({ entities, relationships });
      setSqlSchema(generatedSql);
    } catch (err) {
      setError('Failed to generate database design.');
      console.error(err);
    } finally {
      setIsGeneratingDesign(false);
    }
  }, [token, generateMermaidERD]);




  // Logout Handler
  // const handleLogout = useCallback(() => {
  //   setIsLoggedIn(false);
  //   setToken('');
  //   setDesignResult(null);
  //   setDatabaseSchema(null);
    
  //   // Reset all input refs
  //   if (usernameRef.current) usernameRef.current.value = '';
  //   if (passwordRef.current) passwordRef.current.value = '';
  //   if (connectionStringRef.current) connectionStringRef.current.value = '';
  // }, []);

  const SqlSection = React.memo(() => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      if (sqlSchema) {
        navigator.clipboard.writeText(sqlSchema).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    };

    const handleDownload = () => {
      if (sqlSchema) {
        const blob = new Blob([sqlSchema], { type: 'text/sql' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'database_schema.sql';
        link.click();
      }
    };

    if (!sqlSchema) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-4 space-y-4"
      >
        <div>
          <h3 className="font-bold mb-2 text-gray-700">Generated SQL Schema:</h3>
          <div className="relative">
            <pre className="w-full border border-gray-300 rounded-md p-4 overflow-x-auto bg-gray-50 text-sm">
              {sqlSchema}
            </pre>
            <div className="absolute top-2 right-2 flex space-x-2">
              <button 
                onClick={handleCopy}
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={handleDownload}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
              >
                Download .sql
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  });

  // Login Form Component
  // const LoginForm = React.memo(() => (
  //   <motion.div 
  //     initial={{ opacity: 0, scale: 0.9 }}
  //     animate={{ opacity: 1, scale: 1 }}
  //     transition={{ duration: 0.3 }}
  //     className="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl p-6"
  //   >
  //     <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
  //       Database Design Automation
  //     </h2>
  //     <form onSubmit={handleLogin} className="space-y-4">
  //       {error && (
  //         <motion.p 
  //           initial={{ opacity: 0 }}
  //           animate={{ opacity: 1 }}
  //           className="text-red-500 text-sm text-center"
  //         >
  //           {error}
  //         </motion.p>
  //       )}
  //       <input 
  //         ref={usernameRef}
  //         type="text" 
  //         placeholder="Username" 
  //         required
  //         disabled={isLoggingIn}
  //         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
  //       />
  //       <input 
  //         ref={passwordRef}
  //         type="password" 
  //         placeholder="Password" 
  //         required
  //         disabled={isLoggingIn}
  //         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
  //       />
  //       <button 
  //         type="submit" 
  //         disabled={isLoggingIn}
  //         className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex justify-center items-center"
  //       >
  //         {isLoggingIn ? <Spinner /> : 'Login'}
  //       </button>
  //     </form>
  //   </motion.div>
  // ));

  // Design Generation Interface
  const DesignInterface = React.memo(() => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        AICoder - Database Designer and Generator
      </h2>
      <div className="space-y-4">

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Prompt
          </label>
          <input 
            ref={connectionStringRef}
            placeholder="Enter Project Description"
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

            {/* New SqlSection component */}
          <SqlSection />
          </motion.div>
        )}

        {/* <button 
          onClick={handleLogout} 
          disabled={isGeneratingDesign}
          className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors mt-4 disabled:opacity-50"
        >
          Logout
        </button> */}
      </div>
    </motion.div>
  ));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <AnimatePresence mode="wait">
        {/* {!isLoggedIn ? <LoginForm key="login" /> : <DesignInterface key="design" />} */}
        <DesignInterface key="design" />
      </AnimatePresence>
    </div>
  );
};

export default DatabaseDesignApp;