-- Re-runnable: a database that already has some or all of these tables (built
-- from db/schema.sql, or by hand) is brought up to date instead of failing.
-- Tables and indexes are created only when missing; constraints only when no
-- constraint of that name exists yet.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "product" (
    "p_id" SERIAL NOT NULL,
    "p_name" VARCHAR(100) NOT NULL,
    "p_price" DECIMAL(18,2),
    "p_stock" INTEGER DEFAULT 0,
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "product_pkey" PRIMARY KEY ("p_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "purchase" (
    "pur_id" SERIAL NOT NULL,
    "purchasedby" VARCHAR(250),
    "productname" VARCHAR(250),
    "quantity" INTEGER,
    "unitprice" DECIMAL(18,2),
    "totalamount" DECIMAL(18,2),
    "invoicenumber" VARCHAR(100),
    "invoicedate" TIMESTAMP(6),
    "status" VARCHAR(50),
    "createddate" TIMESTAMP(6),

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("pur_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "retailer" (
    "ret_id" SERIAL NOT NULL,
    "retailername" VARCHAR(250) NOT NULL,
    "contactperson" VARCHAR(250),
    "phonenumber" VARCHAR(50),
    "email" VARCHAR(250),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'India',
    "postalcode" VARCHAR(8),
    "taxnumber" VARCHAR(100),
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "retailer_pkey" PRIMARY KEY ("ret_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier" (
    "sup_id" SERIAL NOT NULL,
    "suppliername" VARCHAR(250) NOT NULL,
    "contactperson" VARCHAR(250),
    "phonenumber" VARCHAR(50),
    "email" VARCHAR(250),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'India',
    "postalcode" VARCHAR(8),
    "taxnumber" VARCHAR(100),
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("sup_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invoice" (
    "inv_id" SERIAL NOT NULL,
    "invoicenumber" VARCHAR(100) NOT NULL,
    "invoicedate" TIMESTAMP(6) NOT NULL,
    "ret_id" INTEGER,
    "billto" VARCHAR(250) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxamount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalamount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Draft',
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("inv_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invoice_item" (
    "item_id" SERIAL NOT NULL,
    "inv_id" INTEGER NOT NULL,
    "p_id" INTEGER,
    "productname" VARCHAR(250) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitprice" DECIMAL(18,2) NOT NULL,
    "linetotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_invoicenumber_key" ON "invoice"("invoicenumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_invoice_item_inv_id" ON "invoice_item"("inv_id");

-- AddForeignKey (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS, so each is checked by name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_ret_id_fkey') THEN
    ALTER TABLE "invoice" ADD CONSTRAINT "invoice_ret_id_fkey" FOREIGN KEY ("ret_id") REFERENCES "retailer"("ret_id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_item_inv_id_fkey') THEN
    ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_inv_id_fkey" FOREIGN KEY ("inv_id") REFERENCES "invoice"("inv_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_item_p_id_fkey') THEN
    ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_p_id_fkey" FOREIGN KEY ("p_id") REFERENCES "product"("p_id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

