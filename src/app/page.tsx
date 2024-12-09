"use client";

import axios from "axios";
import { ChangeEvent, FormEvent, useState } from "react";



export default function Home() {
    const [tenantId, setTenantId] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [chatbotVisible, setChatbotVisible] = useState<boolean>(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleTenantChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTenantId(e.target.value);
    };

    const handleUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (!tenantId || !file) {
            setUploadStatus("Please provide a tenant ID and select a file.");
            return;
        }

        const formData = new FormData();
        formData.append("document", file);
        formData.append("tenantId", tenantId);

        try {
            setUploadStatus("Uploading and processing document...");
            console.log("Uploading document with Tenant ID:", tenantId);

            const response = await axios.post(
                "/api/upload-document",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            console.log("Server Response:", response.data);
            setUploadStatus("Document uploaded and processed successfully!");
            setChatbotVisible(true);
        } catch (error) {
            console.error("Error uploading document:", error);

            if (axios.isAxiosError(error)) {
                console.log("Axios Error Details:", {
                    status: error.response?.status,
                    data: error.response?.data,
                });
                setUploadStatus(
                    `Upload failed: ${
                        error.response?.data?.message || "An error occurred"
                    }`
                );
            } else {
                setUploadStatus("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center p-8 space-y-6" style={{ backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
            <h1 className="text-3xl font-bold">Tenant Chatbot Document Upload</h1>
            <form onSubmit={handleUpload} className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-lg">
                <div className="flex flex-col mb-6">
                    <label htmlFor="tenantId" className="text-lg font-medium">Tenant ID:</label>
                    <input
                        type="text"
                        id="tenantId"
                        value={tenantId}
                        onChange={handleTenantChange}
                        className="p-3 bg-gray-700 text-white rounded shadow-sm focus:outline-none focus:ring focus:ring-blue-500"
                        required
                    />
                </div>
                <div className="flex flex-col mb-6">
                    <label htmlFor="document" className="text-lg font-medium">Upload Document:</label>
                    <input
                        type="file"
                        id="document"
                        onChange={handleFileChange}
                        className="p-3 bg-gray-700 text-white rounded shadow-sm focus:outline-none focus:ring focus:ring-blue-500"
                        required
                    />
                </div>
                <button type="submit" className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium shadow-lg">Upload Document</button>
            </form>

            {uploadStatus && <p className="mt-6 text-center text-lg font-medium">{uploadStatus}</p>}

            {chatbotVisible && tenantId && (
                <iframe
                    id="chatbot-iframe"
                    src={`http://localhost:3000/index.html?tenantId=${tenantId}`}
                    frameBorder="0"
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '400px',
                        height: '600px',
                        border: 'none',
                        zIndex: 1000,
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                ></iframe>
            )}

            {chatbotVisible && tenantId && (
                <div className="mt-12 w-full max-w-3xl">
                    <h2 className="text-xl font-bold mb-4">Chatbot Embed Code</h2>
                    <pre className="bg-gray-900 p-6 rounded shadow-lg overflow-x-auto text-white">
                        <code>
                            {`<!--########################################################
######################CHATBOT EMBEDDDDD######################################
############################################################# -->
<style>
/* Styling to position the iframe as an overlay */
#chatbot-iframe {
  position: fixed;  /* Ensures it's positioned relative to the viewport */
  bottom: 20px;     /* Distance from the bottom */
  right: 20px;      /* Distance from the right */
  width: 400px;     /* Set the width of the iframe */
  height: 600px;    /* Set the height of the iframe */
  border: none;     /* Remove border around the iframe */
  z-index: 1000;    /* High z-index to overlay on top of other elements */
  /* box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2); Optional shadow for aesthetics */
}
</style>
<iframe 
  id="chatbot-iframe" 
  src="http://localhost:3000/index.html?tenantId=${tenantId}" 
  frameborder="0">
</iframe>
<!--########################################################
######################CHATBOT EMBEDDDDD######################################
############################################################# -->`}
                        </code>
                    </pre>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(
                                `<!--########################################################
######################CHATBOT EMBEDDDDD######################################
############################################################# -->
<style>
/* Styling to position the iframe as an overlay */
#chatbot-iframe {
  position: fixed;  /* Ensures it's positioned relative to the viewport */
  bottom: 20px;     /* Distance from the bottom */
  right: 20px;      /* Distance from the right */
  width: 400px;     /* Set the width of the iframe */
  height: 600px;    /* Set the height of the iframe */
  border: none;     /* Remove border around the iframe */
  z-index: 1000;    /* High z-index to overlay on top of other elements */
  /* box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2); Optional shadow for aesthetics */
}
</style>
<iframe 
  id="chatbot-iframe" 
  src="http://localhost:3000/index.html?tenantId=${tenantId}" 
  frameborder="0">
</iframe>
<!--########################################################
######################CHATBOT EMBEDDDDD######################################
############################################################# -->`
                            );
                            alert("Code copied to clipboard!");
                        }}
                        className="mt-4 p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium shadow-lg"
                    >
                        Copy Code
                    </button>
                </div>
            )}
        </div>
    );
}
