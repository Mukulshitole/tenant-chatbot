import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";
import { MongoClient } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

dotenv.config();

let embeddingExtractor: any;

pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  .then((extractor) => {
    embeddingExtractor = extractor;
    console.log("Embedding extractor initialized");
  })
  .catch((error) => {
    console.error("Failed to initialize embedding extractor:", error);
  });

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { tenantId, message } = req.body;

  if (!tenantId || !message) {
    res.status(400).json({ message: "Tenant ID and message are required." });
    return;
  }

  let connection: MongoClient | undefined;

  try {
    connection = await MongoClient.connect(process.env.MONGODB_URL as string);
    const database = connection.db("Rag_doc");
    const docsCollection = database.collection("docs");

    if (!embeddingExtractor) {
      throw new Error("Embedding extractor is not initialized.");
    }

    console.log("Generating embedding for the user query...");
    const messageEmbedding = await embeddingExtractor(message, { pooling: "mean", normalize: true });
    const queryEmbeddingArray = Array.from(messageEmbedding.data);
    console.log("Query Embedding (first 10 dimensions):", queryEmbeddingArray.slice(0, 10));

    console.log("Performing vector search...");
    const vectorSearch = await docsCollection.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          queryVector: queryEmbeddingArray,
          path: "embedding",
          exact: false,
          limit: 3,
          numCandidates: 3,
          filter: { tenantId },
        },
      },
    ]).toArray();

    console.log("Vector Search Results:", vectorSearch);

    if (vectorSearch.length === 0) {
      res.json({
        chatResponse: "No relevant documents found for your query.",
      });
      return;
    }

    const context = vectorSearch
      .filter((doc: any) => typeof doc.text === "string" && doc.text.trim().length > 10)
      .map((doc: any) => doc.text)
      .join("\n");

    if (!context.trim()) {
      res.json({
        chatResponse: "No relevant documents found for your query.",
      });
      return;
    }

    console.log("Prepared Context:", context);

    const GROQ_KEYS = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
    ].filter(Boolean) as string[];

    const getRandomAPIKey = (keys: string[]) => keys[Math.floor(Math.random() * keys.length)];

    const groq = new Groq({ apiKey: getRandomAPIKey(GROQ_KEYS) });

    const messages = [
      { role: "system", content: "You are a helpful assistant. Answer in short and relevant terms to the user query." },
      { role: "user", content: `User query: ${message}, context: ${context}` },
    ];

    console.log("Sending query to Groq...");
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant. Answer in short and relevant terms to the user query." },
      { role: "user", content: `User query: ${message}, context: ${context}` },
      ],
      model: "llama3-8b-8192",
      max_tokens: 4000,
      temperature: 0.6,
    });

    const aiResponse = completion.choices?.[0]?.message?.content || "No response from AI.";
    console.log("AI Response:", aiResponse);

    res.json({ chatResponse: aiResponse, relevantDocuments: vectorSearch });
  } catch (error) {
    console.error("Error in conversation route:", error);
    res.status(500).json({ message: "Internal Server Error." });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
};

export default handler;
