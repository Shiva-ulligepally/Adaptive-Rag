import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';
import { LocalVectorStore, chunkText, ChromaClient, queryGroqLLM } from './rag-engine.js';
import { executeAdaptiveRAG } from './rag/adaptive-rag.js';



// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[DEBUG] __dirname:", __dirname);
const documentsDir = path.join(__dirname, 'documents');
console.log("[DEBUG] documentsDir:", documentsDir);
if (fs.existsSync(documentsDir)) {
  console.log("[DEBUG] Documents found:");
  console.log(fs.readdirSync(documentsDir));
} else {
  console.log("[DEBUG] Documents directory missing");
}

dotenv.config({ path: path.join(__dirname, '.env') });


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "25mb"
}));

// Helper: Scan documents directory dynamically for all PDF files
function getPdfFiles() {
  const documentsDir = path.join(__dirname, 'documents');
  try {
    if (!fs.existsSync(documentsDir)) {
      console.error("[PDF ERROR] Documents directory missing");
      return [];
    }
    const files = fs.readdirSync(documentsDir);
    return files
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        name: f,
        path: path.join(documentsDir, f)
      }));
  } catch (e) {
    console.error(`[PDF Scan Error]: ${e.message}`);
    return [];
  }
}

// Global in-memory vector store instance
const localStore = new LocalVectorStore();
let isIndexed = false;
let indexedMetadata = {
  fileName: '',
  chunkCount: 0,
  totalPages: 0,
  charCount: 0,
  vocabularySize: 0,
  indexTime: null,
  files: []
};

// Check if Chroma is available
async function getChromaHealth(url, apiKey) {
  const client = new ChromaClient(url || process.env.CHROMA_URL, apiKey || process.env.CHROMA_API_KEY);
  return await client.checkHealth();
}

// Shareable multi-document indexing workflow
async function performIndexing(chunkSize = 150, chunkOverlap = 30, chromaUrl = null, chromaApiKey = null) {
  const pdfFiles = getPdfFiles();
  if (pdfFiles.length === 0) {
    throw new Error("No PDF documents found in the project root directory.");
  }

  console.log(`[RAG Engine] Starting indexing for ${pdfFiles.length} documents...`);
  let allChunks = [];
  let totalPages = 0;
  let totalChars = 0;
  const fileStats = [];

  for (const file of pdfFiles) {
    console.log(`[RAG Engine] Indexing file: ${file.name}`);
    const dataBuffer = fs.readFileSync(file.path);
    const parsedPdf = await pdf(dataBuffer);
    const text = parsedPdf.text;
    
    totalPages += parsedPdf.numpages;
    totalChars += text.length;

    // Use enhanced heading propagation chunker
    const chunks = chunkText(text, chunkSize, chunkOverlap);
    
    // Prefix chunk IDs and store source file in metadata
    const fileSlug = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    chunks.forEach((c) => {
      c.metadata = {
        ...c.metadata,
        source: file.name
      };
      c.id = `${fileSlug}_${c.id}`;
    });

    allChunks = allChunks.concat(chunks);
    fileStats.push({
      fileName: file.name,
      chunkCount: chunks.length,
      pages: parsedPdf.numpages,
      chars: text.length
    });
  }

  // Index all combined chunks in our local TF-IDF vector database
  localStore.indexChunks(allChunks);

  // Store in Chroma DB if available
  let chromaIndexed = false;
  let chromaError = null;
  const activeChromaUrl = chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000';
  const activeChromaKey = chromaApiKey || process.env.CHROMA_API_KEY || '';
  
  const chromaHealthy = await getChromaHealth(activeChromaUrl, activeChromaKey);
  if (chromaHealthy) {
    try {
      console.log(`[RAG Engine] Connecting and indexing to Chroma DB collection at ${activeChromaUrl}...`);
      const chroma = new ChromaClient(activeChromaUrl, activeChromaKey);
      await chroma.addDocuments(allChunks, localStore);
      chromaIndexed = true;
    } catch (err) {
      console.error(`[RAG Engine] Chroma DB insertion failed: ${err.message}`);
      chromaError = err.message;
    }
  }

  isIndexed = true;
  indexedMetadata = {
    fileName: pdfFiles.map(f => f.name).join(', '),
    chunkCount: allChunks.length,
    totalPages,
    charCount: totalChars,
    vocabularySize: localStore.vocabulary.size,
    indexTime: new Date().toISOString(),
    chunkSize,
    chunkOverlap,
    files: fileStats
  };

  return {
    stats: indexedMetadata,
    chroma: {
      indexed: chromaIndexed,
      error: chromaError,
      url: activeChromaUrl
    }
  };
}

// API Health Check / System Status
app.get('/api/status', async (req, res) => {
  const queryChroma = req.query.chromaUrl;
  const queryChromaKey = req.query.chromaApiKey;
  
  const chromaUrl = queryChroma || process.env.CHROMA_URL || 'http://localhost:8000';
  const chromaApiKey = queryChromaKey || process.env.CHROMA_API_KEY || '';

  const pdfFiles = getPdfFiles();
  const chromaHealthy = await getChromaHealth(chromaUrl, chromaApiKey);

  res.json({
    status: 'online',
    pdfFound: pdfFiles.length > 0,
    pdfFiles: pdfFiles.map(f => f.name),
    pdfPath: pdfFiles.map(f => f.path).join(', '),
    isIndexed,
    indexStats: isIndexed ? indexedMetadata : null,
    chroma: {
      connected: chromaHealthy,
      url: chromaUrl,
      collection: 'constitution_part3_rag'
    }
  });
});

// Endpoint to index all root documents
app.post('/api/index-existing', async (req, res) => {
  try {
    const { chunkSize = 150, chunkOverlap = 30, chromaUrl, chromaApiKey } = req.body;
    
    const result = await performIndexing(chunkSize, chunkOverlap, chromaUrl, chromaApiKey);

    res.json({
      success: true,
      message: `Successfully parsed, chunked, and indexed all documents!`,
      stats: result.stats,
      chroma: result.chroma
    });

  } catch (error) {
    console.error(`[Indexer Error]: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `Internal server indexing error: ${error.message}`
    });
  }
});

// Endpoint to query RAG across all indexed documents
app.post('/api/query', async (req, res) => {
  try {
    const {
      query,
      numResults = 3,
      chunkSize = 150,
      chunkOverlap = 30,
      groqApiKey,
      chromaUrl,
      chromaApiKey
    } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required.' });
    }

    const activeChromaUrl = chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000';
    const activeChromaKey = chromaApiKey || process.env.CHROMA_API_KEY || '';
    const activeGroqKey = groqApiKey || process.env.GROQ_API_KEY;

    // Auto-index fallback if not indexed yet
    if (!isIndexed) {
      console.log(`[RAG Query] Server not indexed. Auto-indexing all PDF documents...`);
      try {
        await performIndexing(chunkSize, chunkOverlap, activeChromaUrl, activeChromaKey);
      } catch (err) {
        return res.status(404).json({
          success: false,
          error: `Auto-indexing failed: ${err.message}. Please upload documents to the project root.`
        });
      }
    }

    if (!activeGroqKey || activeGroqKey === 'your_groq_api_key_here' || activeGroqKey.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Groq API Key is missing. Please provide it in settings or environment.'
      });
    }

    // Invoke Adaptive RAG Orchestrator Pipeline
    const result = await executeAdaptiveRAG({
      query,
      localStore,
      groqApiKey: activeGroqKey,
      chromaUrl: activeChromaUrl,
      chromaApiKey: activeChromaKey,
      numResults,
      chunkSize,
      chunkOverlap
    });

    const isUnrelated = result.hallucinationEvaluation?.hallucinated || result.answer.includes("I am sorry, but the provided document does not contain information");

    return res.json({
      success: true,
      answer: result.answer,
      isUnrelated,
      sources: result.sources,
      retrievedChunks: result.pipeline?.rerankedResults?.map(r => ({
        chunk: {
          id: r.id,
          text: r.text,
          metadata: r.metadata
        },
        score: r.score
      })) || [],
      usedEngine: result.usedEngine,
      inspector: {
        systemPrompt: result.pipeline?.finalContext ? `DOCUMENT CONTEXT:\n${result.pipeline.finalContext}\n---` : '',
        userQuery: query
      },
      // Premium Adaptive RAG Grader & Router metrics
      adaptive: {
        route: result.route,
        dynamicParams: result.dynamicParams,
        retrievalGrades: result.retrievalGrades,
        queryRewrite: result.queryRewrite,
        hallucinationEvaluation: result.hallucinationEvaluation,
        answerEvaluation: result.answerEvaluation,
        pipelineHistory: result.pipelineHistory,
        webSearchResults: result.webSearchResults || []
      },
      pipeline: result.pipeline
    });

  } catch (error) {
    console.error(`[Query Route Error]: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `RAG search or LLM generation failed: ${error.message}`
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server Ready] Naive RAG backend running on http://localhost:${PORT}`);
  });
}

export default app;
