import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSessionUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/services/audit.service";
import { uploadThingPrivateFiles } from "@/services/file-storage.service";

const f = createUploadthing();

// File size limit: 16MB
const MAX_FILE_SIZE = "16MB";

// Private files (SOW 11.3). UploadThing rejects acl unless "Allow overriding
// ACL" / private files is enabled for the app in its dashboard, so this is
// switched on with UPLOADTHING_PRIVATE_FILES=true once that setting is on.
// Downloads use signed URLs either way (src/services/file-storage.service.ts).
const ACL = uploadThingPrivateFiles() ? ({ acl: "private" } as const) : {};

export const ourFileRouter = {
    memberFileUploader: f({
        pdf: { maxFileSize: MAX_FILE_SIZE, maxFileCount: 10, ...ACL },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
            maxFileSize: MAX_FILE_SIZE,
            maxFileCount: 10,
            ...ACL,
        },
        image: { maxFileSize: MAX_FILE_SIZE, maxFileCount: 10, ...ACL },
    })
        .middleware(async () => {
            // Auth check
            const cookieStore = await cookies();
            const token = cookieStore.get("auth-token")?.value;

            if (!token) throw new Error("Unauthorized");

            const user = await getSessionUser(token);
            if (!user) throw new Error("Unauthorized");

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
            const created = await prisma.memberFile.create({
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

            await recordAudit({
                action: "FILE_UPLOADED",
                actorId: metadata.userId,
                targetType: "MemberFile",
                targetId: created.id,
                metadata: { fileType, size: file.size },
            });
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
