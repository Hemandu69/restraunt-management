-- Product-model correction: the operational role is specifically a WAITER,
-- not a generic "staff" member. SQLite has no ALTER TABLE ... DROP
-- CONSTRAINT, so changing the CHECK constraint requires the standard
-- rebuild-the-table pattern: create the new shape, copy data across
-- (renaming any existing 'STAFF' rows to 'WAITER' in the same pass), drop
-- the old table, rename the new one into place.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK ("role" IN ('MANAGER', 'WAITER')),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

INSERT INTO "new_User" ("id", "name", "email", "passwordHash", "role", "status", "createdAt", "updatedAt", "lastLoginAt")
SELECT
  "id", "name", "email", "passwordHash",
  CASE "role" WHEN 'STAFF' THEN 'WAITER' ELSE "role" END,
  "status", "createdAt", "updatedAt", "lastLoginAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");

PRAGMA foreign_keys=ON;
