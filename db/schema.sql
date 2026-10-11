-- ---------------------------------------------------------------------------
-- billing — original schema
--
-- The tables as they were first designed. Everything added since (payments,
-- logins and roles, GST and MRP columns, retailer orders) lives only in
-- prisma/migrations, which is the source of truth. Safe to re-run: each
-- statement is IF NOT EXISTS, so running it against a populated database
-- changes nothing and drops no data.
--
-- On a new machine you do not need this file at all: create the database and
-- run `npm run db:deploy` (or just `npm run dev`), which builds every table
-- from the migrations.
--
-- If the DATABASE itself is gone, create it first — this cannot be done from
-- inside a connection to it:
--
--   psql -U postgres -c "CREATE DATABASE billing;"
--
-- If you do use this file, bring the result up to date with the migrations:
--
--   npm run db:init
--   npm run db:deploy
--
-- Never follow it with `prisma db pull`: that would rewrite
-- prisma/schema.prisma from these old tables and drop the newer models.
--
-- Tables are ordered by dependency: referenced tables come before the tables
-- that point at them, so a clean run never hits a missing-relation error.
--   supplier, purchase          (standalone)
--   retailer, product           (referenced by invoicing)
--   invoice                     -> retailer
--   invoice_item                -> invoice, product
--
-- Constraints are declared inline so PostgreSQL generates its usual default
-- names (invoice_pkey, invoice_ret_id_fkey, ...). A rebuild is then identical
-- to the current database, which matters because Prisma introspection reads
-- those names back.
-- ---------------------------------------------------------------------------


-- --- suppliers -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Supplier (
    sup_id        serial PRIMARY KEY,
    SupplierName  VARCHAR(250) NOT NULL,
    ContactPerson VARCHAR(250),
    PhoneNumber   VARCHAR(50),
    Email         VARCHAR(250),
    Address       TEXT,
    City          VARCHAR(100),
    State         VARCHAR(100),
    Country       VARCHAR(100) DEFAULT 'India',
    PostalCode    VARCHAR(8),
    TaxNumber     VARCHAR(100),
    CreatedDate   TIMESTAMP,
    UpdatedDate   TIMESTAMP
);


-- --- retailers (customers billed by invoices) -------------------------------
CREATE TABLE IF NOT EXISTS Retailer (
    Ret_id        serial PRIMARY KEY,
    RetailerName  VARCHAR(250) NOT NULL,
    ContactPerson VARCHAR(250),
    PhoneNumber   VARCHAR(50),
    Email         VARCHAR(250),
    Address       TEXT,
    City          VARCHAR(100),
    State         VARCHAR(100),
    Country       VARCHAR(100) DEFAULT 'India',
    PostalCode    VARCHAR(8),
    TaxNumber     VARCHAR(100),
    CreatedDate   TIMESTAMP,
    UpdatedDate   TIMESTAMP
);


-- --- products ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Product (
    p_id        serial PRIMARY KEY,
    p_name      VARCHAR(100) NOT NULL,
    p_price     DECIMAL(18,2),
    p_stock     INT DEFAULT 0,
    CreatedDate TIMESTAMP,
    UpdatedDate TIMESTAMP
);


-- --- purchases --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Purchase (
    pur_id        serial PRIMARY KEY,
    PurchasedBy   VARCHAR(250),
    ProductName   VARCHAR(250),
    Quantity      INT,
    UnitPrice     DECIMAL(18,2),
    TotalAmount   DECIMAL(18,2),
    InvoiceNumber VARCHAR(100),
    InvoiceDate   TIMESTAMP,
    Status        VARCHAR(50),
    CreatedDate   TIMESTAMP
);


-- --- invoice header ---------------------------------------------------------
-- Ret_id is ON DELETE SET NULL and BillTo is a snapshot of the customer name,
-- so removing a retailer can never erase or corrupt invoice history.
CREATE TABLE IF NOT EXISTS Invoice (
    inv_id        serial PRIMARY KEY,
    InvoiceNumber VARCHAR(100) NOT NULL UNIQUE,
    InvoiceDate   TIMESTAMP NOT NULL,
    Ret_id        INT REFERENCES Retailer(Ret_id) ON DELETE SET NULL,
    BillTo        VARCHAR(250) NOT NULL,
    SubTotal      DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount     DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount   DECIMAL(18,2) NOT NULL DEFAULT 0,
    Status        VARCHAR(50) NOT NULL DEFAULT 'Draft',
    CreatedDate   TIMESTAMP,
    UpdatedDate   TIMESTAMP
);


-- --- invoice line items -----------------------------------------------------
-- inv_id cascades: deleting an invoice removes its lines.
-- p_id is SET NULL with ProductName/UnitPrice snapshotted, so a past invoice
-- still shows what was actually billed after a product is renamed or repriced.
CREATE TABLE IF NOT EXISTS Invoice_Item (
    item_id     serial PRIMARY KEY,
    inv_id      INT NOT NULL REFERENCES Invoice(inv_id) ON DELETE CASCADE,
    p_id        INT REFERENCES Product(p_id) ON DELETE SET NULL,
    ProductName VARCHAR(250) NOT NULL,
    Quantity    INT NOT NULL,
    UnitPrice   DECIMAL(18,2) NOT NULL,
    LineTotal   DECIMAL(18,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_item_inv_id ON Invoice_Item(inv_id);
