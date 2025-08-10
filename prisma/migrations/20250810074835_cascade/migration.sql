-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LLM" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "userId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    CONSTRAINT "LLM_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LLM_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LLM" ("answers", "createdAt", "documentId", "id", "questions", "updatedAt", "userId") SELECT "answers", "createdAt", "documentId", "id", "questions", "updatedAt", "userId" FROM "LLM";
DROP TABLE "LLM";
ALTER TABLE "new_LLM" RENAME TO "LLM";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
