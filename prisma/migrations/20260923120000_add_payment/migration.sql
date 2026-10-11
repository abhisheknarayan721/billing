-- Re-runnable: the table is created only if it does not exist yet.

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment" (
    "pay_id" SERIAL NOT NULL,
    "pay_name" VARCHAR(100) NOT NULL,
    "pay_amt" DECIMAL(18,2),
    "pay_method" VARCHAR(100),
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("pay_id")
);
