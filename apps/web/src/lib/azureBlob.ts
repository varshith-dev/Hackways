import { BlobServiceClient } from "@azure/storage-blob";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "";

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || "uploads";

let blobServiceClient: BlobServiceClient | null = null;

function getBlobClient() {
  if (!blobServiceClient && CONNECTION_STRING) {
    try {
      blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    } catch (err) {
      console.error("Failed to initialize Azure BlobServiceClient:", err);
    }
  }
  return blobServiceClient;
}

export async function uploadToAzureBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  const client = getBlobClient();
  if (!client) return null;

  try {
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    // Ensure container exists with public blob access
    await containerClient.createIfNotExists({ access: "blob" });

    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: "public, max-age=31536000, immutable",
      },
    });

    return blockBlobClient.url;
  } catch (err) {
    console.error("Azure Blob upload error:", err);
    return null;
  }
}
