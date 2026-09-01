import { createUploadthing, type FileRouter } from "uploadthing/next";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

// File size limit: 16MB
const MAX_FILE_SIZE = "16MB";

export const ourFileRouter = {
    memberFileUploader: f({
        pdf: { maxFileSize: MAX_FILE_SIZE, maxFileCount: 10 },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
            maxFileSize: MAX_FILE_SIZE,
            maxFileCount: 10,
        },
        image: { maxFileSize: MAX_FILE_SIZE, maxFileCount: 10 },
    })
        .middleware(async () => {
            // Auth check
            const cookieStore = await cookies();
            const token = cookieStore.get("auth-token")?.value;

            if (!token) throw new Error("Unauthorized");

            const user = await verifyToken(token);

            return { userId: user.userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // Determine file type
            let fileType: "PDF" | "DOCX" | "JPG" | "PNG" | "OTHER" = "OTHER";
            if (file.type === "application/pdf") fileType = "PDF";
            else if (file.type.includes("wordprocessingml")) fileType = "DOCX";
            else if (file.type === "image/jpeg" || file.type === "image/jpg") fileType = "JPG";
            else if (file.type === "image/png") fileType = "PNG";

            // Save file metadata to DB
            await prisma.memberFile.create({
                data: {
                    filename: file.name,
                    fileKey: file.key,
                    fileUrl: file.ufsUrl,
                    fileSize: file.size,
                    fileType,
                    mimeType: file.type,
                    userId: metadata.userId,
                },
            });

            console.log(`File uploaded: ${file.name} for user ${metadata.userId}`);
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
