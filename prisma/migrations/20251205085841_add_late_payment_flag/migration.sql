-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "latePayment" BOOLEAN NOT NULL DEFAULT false,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendances_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_attendances" ("courseId", "date", "id", "remarks", "scannedAt", "status", "studentId") SELECT "courseId", "date", "id", "remarks", "scannedAt", "status", "studentId" FROM "attendances";
DROP TABLE "attendances";
ALTER TABLE "new_attendances" RENAME TO "attendances";
CREATE INDEX "attendances_courseId_idx" ON "attendances"("courseId");
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");
CREATE INDEX "attendances_date_idx" ON "attendances"("date");
CREATE UNIQUE INDEX "attendances_studentId_courseId_date_key" ON "attendances"("studentId", "courseId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
