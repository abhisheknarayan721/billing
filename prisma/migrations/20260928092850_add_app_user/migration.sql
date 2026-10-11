-- Re-runnable: the table and its index are created only if they do not exist.
-- An existing table may already call the column "password" (the next
-- migration's rename), so it is left as it is.

-- CreateTable
CREATE TABLE IF NOT EXISTS "app_user" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "fullname" VARCHAR(250),
    "passwordhash" VARCHAR(255) NOT NULL,
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "app_user_username_key" ON "app_user"("username");
