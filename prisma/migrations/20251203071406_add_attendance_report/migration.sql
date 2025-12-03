-- CreateTable
CREATE TABLE "attendance_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_reports_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "attendance_reports_date_idx" ON "attendance_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reports_courseId_date_key" ON "attendance_reports"("courseId", "date");

-- CreateIndex
CREATE INDEX "attendances_courseId_idx" ON "attendances"("courseId");

-- CreateIndex
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");
