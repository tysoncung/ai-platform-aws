# RAG Pipeline Example

Full **Retrieval-Augmented Generation** pipeline using the AI Gateway and MongoDB Atlas Vector Search.

## Architecture

```
                    
                      Markdown   
                       Docs      
                    
                            ingest.ts
                         
                       Chunk &   >  AI Gateway   
                       Embed     <  (embeddings) 
                         
                           
                    
                      MongoDB    
                      Atlas      
                      (vectors)  
                    
                            search.ts / chat.ts
                         
                      Query ->    >  AI Gateway   
                      Retrieve -> <  (LLM chat)  
                      Generate        
                    
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm ingest` | Load sample docs, chunk, embed, store in MongoDB |
| `pnpm search` | Vector similarity search (`pnpm search "your query"`) |
| `pnpm chat` | Full RAG chat (`pnpm chat "your question"`) |

## Prerequisites

1. **MongoDB Atlas** cluster with vector search enabled
2. **AI Gateway** running with an embedding model and a chat model
3. Node.js 18+

## Setup

### 1. MongoDB Atlas Vector Search Index

Create a vector search index on your collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

Name the index `vector_index`. Adjust `numDimensions` to match your embedding model.

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, gateway URL, and model names
```

### 3. Run

```bash
pnpm install

# Step 1: Ingest sample documents
pnpm ingest

# Step 2: Search
pnpm search "What pricing plans are available?"

# Step 3: Full RAG chat
pnpm chat "How do I handle rate limit errors?"
```

## Sample Data

The `sample-data/` directory contains fake product documentation for "AcmeCloud":

- `product-overview.md` - Features and pricing
- `getting-started.md` - Installation and quick start
- `troubleshooting.md` - Common issues and solutions

Replace these with your own documents for real use cases.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_URL` | AI Gateway URL | `http://localhost:3000` |
| `GATEWAY_API_KEY` | Gateway API key | - |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `rag_demo` |
| `MONGODB_COLLECTION` | Collection name | `documents` |
| `EMBEDDING_MODEL` | Model for embeddings | `bedrock/titan-embed-v2` |
| `CHAT_MODEL` | Model for chat generation | `bedrock/claude-3-sonnet` |
