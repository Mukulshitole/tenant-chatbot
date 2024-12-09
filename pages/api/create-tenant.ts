import express, { Request, Response } from "express";
import { MongoClient } from "mongodb";

type CreateTenantRequest = {
    tenantId: string;
    name: string;
};

const router = express.Router();

router.post("/create-tenant", async (req: Request, res: Response): Promise<void> => {
    const { tenantId, name } = req.body as CreateTenantRequest;

    if (!tenantId || !name) {
        res.status(400).json({ message: "Tenant ID and name are required." });
        return;
    }

    let connection: MongoClient | null = null;

    try {
        connection = await MongoClient.connect(process.env.MONGODB_URL || "");
        const database = connection.db("Rag_doc");
        const tenantCollection = database.collection("tenants");

        const existingTenant = await tenantCollection.findOne({ tenantId });
        if (existingTenant) {
            res.status(400).json({ message: "Tenant already exists." });
            return;
        }

        await tenantCollection.insertOne({
            tenantId,
            name,
            createdAt: new Date(),
        });

        res.json({ message: "Tenant created successfully." });
    } catch (error) {
        console.error("Error creating tenant:", error);
        res.status(500).json({ message: "Error creating tenant." });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Error closing MongoDB connection:", closeError);
            }
        }
    }
});

export default router;
