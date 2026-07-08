const logger = require('firebase-functions/logger');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { GoogleGenAIEmbeddings, ChatGoogleGenAI } = require('@langchain/google-genai');
const { Document } = require('@langchain/core/documents');
const { createStuffDocumentsChain } = require('langchain/chains/combine_documents');
const { createRetrievalChain } = require('langchain/chains/retrieval');
const { PromptTemplate } = require('@langchain/core/prompts');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * MOCK KNOWLEDGE BASE: USSF and KNVB tactical manuals.
 * In production, this would be indexed into Pinecone or Vertex AI Vector Search.
 */
const KNOWLEDGE_BASE = [
  new Document({ 
    pageContent: 'USSF B-License Curriculum: High Press Triggers. The 9 and 10 initiate the press when the opponent center-back receives the ball facing their own goal. The weak-side winger tucks in.',
    metadata: { source: 'USSF_Manual_Pg142' }
  }),
  new Document({
    pageContent: 'KNVB Curriculum: 9v9 Phase Play with offside lines. Use a 60x40 grid to simulate the middle third. Emphasize vertical passing and third-man runs to break lines.',
    metadata: { source: 'KNVB_Manual_PhasePlay' }
  }),
  new Document({
    pageContent: 'USSF Youth Curriculum: U14 Aerobic Fitness should be trained implicitly via 4v4+3 rondos rather than isolated running. Work-to-rest ratio should be 2:1.',
    metadata: { source: 'USSF_Manual_Pg88' }
  })
];

/**
 * PHASE 2: THE SEMANTIC CLOUD FUNCTION
 * Secures LLM keys via Google Cloud Secret Manager and executes a true LangChain RetrievalQA chain.
 */
exports.generateTacticalPlan = onCall(
  { 
    region: 'us-central1',
    secrets: [geminiApiKey],
    timeoutSeconds: 30,
    memory: '512MB'
  },
  async (request) => {
    // 1. Verify Authorization
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const role = request.auth.token.role || 'player';
    if (role !== 'coach' && role !== 'director' && role !== 'global_admin') {
      throw new HttpsError('permission-denied', 'Only coaches can generate tactical plans.');
    }

    const { prompt } = request.data;
    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'The function must be called with one argument "prompt".');
    }

    logger.info(`Coach ${request.auth.uid} requested tactical plan for: ${prompt}`);

    try {
      // Initialize Gemini Model and Embeddings using the injected Secret Manager Key
      const apiKey = geminiApiKey.value();
      
      const embeddings = new GoogleGenAIEmbeddings({ apiKey });
      const model = new ChatGoogleGenAI({ apiKey, modelName: 'gemini-1.5-flash', temperature: 0.2 });

      // Build the in-memory Vector Database
      const vectorStore = await MemoryVectorStore.fromDocuments(KNOWLEDGE_BASE, embeddings);
      const retriever = vectorStore.asRetriever(2); // Retrieve top 2 most relevant chunks

      // Construct the RAG Chain
      const systemTemplate = `You are an elite soccer tactician AI connected to the USSF and KNVB databases.
Answer the coach's request using the provided context. If the context does not contain the answer, say "Insufficient tactical data."
Format your response in crisp, markdown format suitable for a high-end military terminal.
Include citations to the sources provided.

Context: {context}

Question: {input}`;

      const promptTemplate = PromptTemplate.fromTemplate(systemTemplate);
      
      const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: promptTemplate,
      });

      const retrievalChain = await createRetrievalChain({
        retriever,
        combineDocsChain,
      });

      // Execute Chain
      const result = await retrievalChain.invoke({ input: prompt });

      logger.info(`RAG Pipeline completed successfully for ${request.auth.uid}`);

      return {
        plan: result.answer
      };

    } catch (error) {
      logger.error('RAG Pipeline failed:', error);
      throw new HttpsError('internal', 'Neural link severed. Failed to generate tactical plan.');
    }
  }
);
