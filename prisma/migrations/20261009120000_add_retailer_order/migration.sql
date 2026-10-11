-- Orders taken from retailers, before they are invoiced.
--
-- Re-runnable: tables, indexes and constraints are created only if missing.

-- CreateTable
CREATE TABLE IF NOT EXISTS "retailer_order" (
    "ord_id" SERIAL NOT NULL,
    "ordernumber" VARCHAR(100) NOT NULL,
    "orderdate" TIMESTAMP(6) NOT NULL,
    "ret_id" INTEGER,
    "retailername" VARCHAR(250) NOT NULL,
    "notes" TEXT,
    "totalamount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "createddate" TIMESTAMP(6),
    "updateddate" TIMESTAMP(6),

    CONSTRAINT "retailer_order_pkey" PRIMARY KEY ("ord_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "retailer_order_item" (
    "item_id" SERIAL NOT NULL,
    "ord_id" INTEGER NOT NULL,
    "p_id" INTEGER,
    "productname" VARCHAR(250) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitprice" DECIMAL(18,2) NOT NULL,
    "linetotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "retailer_order_item_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "retailer_order_ordernumber_key" ON "retailer_order"("ordernumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_retailer_order_ret_id" ON "retailer_order"("ret_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_retailer_order_item_ord_id" ON "retailer_order_item"("ord_id");

-- AddForeignKey (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS, so each is checked by name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retailer_order_ret_id_fkey') THEN
    ALTER TABLE "retailer_order" ADD CONSTRAINT "retailer_order_ret_id_fkey" FOREIGN KEY ("ret_id") REFERENCES "retailer"("ret_id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retailer_order_item_ord_id_fkey') THEN
    ALTER TABLE "retailer_order_item" ADD CONSTRAINT "retailer_order_item_ord_id_fkey" FOREIGN KEY ("ord_id") REFERENCES "retailer_order"("ord_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retailer_order_item_p_id_fkey') THEN
    ALTER TABLE "retailer_order_item" ADD CONSTRAINT "retailer_order_item_p_id_fkey" FOREIGN KEY ("p_id") REFERENCES "product"("p_id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
