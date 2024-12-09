import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";
import fs from "fs";
import { MongoClient } from "mongodb";
import multer from "multer";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import pdfParse from "pdf-parse";

dotenv.config();

// S3 Configuration
const s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: "AKIA4INYUHKOJXESKYMB",
        secretAccessKey: "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",
    },
});

const BUCKET_NAME = "whatsapptrial";

const upload = multer({ dest: "./uploads" });

async function uploadToS3(filePath: string, key: string, contentType: string) {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
    });
    await s3Client.send(command);
}

let embeddingExtractor: any;
pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2").then((extractor) => {
    embeddingExtractor = extractor;
    console.log("Embedding extractor initialized");
});

// MongoDB Setup
const setupMongoDB = async () => {
    const connection = await MongoClient.connect(process.env.MONGODB_URL!);
    const database = connection.db("Rag_doc");
    return { connection, database, docsCollection: database.collection("docs") };
};

const uploadMiddleware = upload.single("document");

export const config = {
    api: {
        bodyParser: false, // Disable body parsing to handle multipart/form-data
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    // Use multer to handle the file upload
    await new Promise((resolve, reject) => {
        uploadMiddleware(req as any, {} as any, (result: any) => {
            if (result instanceof Error) return reject(result);
            resolve(true);
        });
    });

    const { tenantId } = req.body as { tenantId: string };
    const file = (req as any).file;

    if (!tenantId || !file) {
        return res.status(400).json({ message: "Tenant ID and document are required." });
    }

    const documentPath = file.path;
    const fileName = `${tenantId}/${path.basename(documentPath)}`;
    const contentType = file.mimetype;

    try {
        // Upload file to S3
        await uploadToS3(documentPath, fileName, contentType);

        // Read and process the document
        const pdfBuffer = fs.readFileSync(documentPath);
        const pdfData = await pdfParse(pdfBuffer);
        const rawText = pdfData.text;

        // Define chunk size and overlap
        const chunkSize = 512;
        const overlapSize = 50;
        const chunks = [];
        for (let start = 0; start < rawText.length; start += chunkSize - overlapSize) {
            chunks.push(rawText.slice(start, start + chunkSize));
        }

        const { connection, database, docsCollection } = await setupMongoDB();
        try {
            // Ensure embeddingExtractor is ready
            if (!embeddingExtractor) throw new Error("Embedding extractor not initialized.");

            for (const chunk of chunks) {
                const embedding = await embeddingExtractor(chunk, {
                    pooling: "mean",
                    normalize: true,
                });
                await docsCollection.insertOne({
                    tenantId,
                    text: chunk,
                    embedding: Array.from(embedding.data),
                    createdAt: new Date(),
                });
            }
        } finally {
            await connection.close();
        }

        // Clean up the file
        fs.unlinkSync(documentPath);

        res.status(200).json({ message: "Document uploaded and processed successfully!" });
    } catch (error: any) {
        console.error("Error uploading document:", error);
        res.status(500).json({ message: error.message });
    }
}
