-- BookSQL Database Schema for PostgreSQL
-- Accounting domain database with 7 interconnected tables

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the main transaction table
CREATE TABLE master_txn_table (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_date DATE NOT NULL,
    created_user VARCHAR(100) NOT NULL,
    account VARCHAR(100) NOT NULL,
    ar_paid VARCHAR(50),
    ap_paid VARCHAR(50),
    due_date DATE,
    open_balance DECIMAL(15,2),
    customers VARCHAR(100),
    vendor VARCHAR(100),
    product_service VARCHAR(100),
    quantity INTEGER,
    rate DECIMAL(15,2),
    credit DECIMAL(15,2),
    debit DECIMAL(15,2),
    payment_method VARCHAR(50),
    misc TEXT
);

-- Chart of Accounts table
CREATE TABLE chart_of_accounts (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    UNIQUE(business_id, account_name)
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_full_name VARCHAR(200),
    billing_address TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(50),
    billing_zip_code VARCHAR(20),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(50),
    shipping_zip_code VARCHAR(20),
    balance DECIMAL(15,2) DEFAULT 0.00,
    UNIQUE(business_id, customer_name)
);

-- Employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50),
    hire_date DATE,
    billing_rate DECIMAL(10,2),
    deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(business_id, employee_name)
);

-- Products and Services table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    product_service VARCHAR(100) NOT NULL,
    product_service_type VARCHAR(50),
    UNIQUE(business_id, product_service)
);

-- Vendors table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    vendor_name VARCHAR(100) NOT NULL,
    billing_address TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(50),
    billing_zip_code VARCHAR(20),
    balance DECIMAL(15,2) DEFAULT 0.00,
    UNIQUE(business_id, vendor_name)
);

-- Payment Methods table
CREATE TABLE payment_method (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    credit_card VARCHAR(100),
    UNIQUE(business_id, payment_method)
);

-- Add foreign key constraints
ALTER TABLE master_txn_table 
ADD CONSTRAINT fk_master_txn_chart_of_accounts 
FOREIGN KEY (business_id, account) 
REFERENCES chart_of_accounts(business_id, account_name);

ALTER TABLE master_txn_table 
ADD CONSTRAINT fk_master_txn_customers 
FOREIGN KEY (business_id, customers) 
REFERENCES customers(business_id, customer_name);

ALTER TABLE master_txn_table 
ADD CONSTRAINT fk_master_txn_vendors 
FOREIGN KEY (business_id, vendor) 
REFERENCES vendors(business_id, vendor_name);

ALTER TABLE master_txn_table 
ADD CONSTRAINT fk_master_txn_products 
FOREIGN KEY (business_id, product_service) 
REFERENCES products(business_id, product_service);

ALTER TABLE master_txn_table 
ADD CONSTRAINT fk_master_txn_payment_method 
FOREIGN KEY (business_id, payment_method) 
REFERENCES payment_method(business_id, payment_method);

-- Create indexes for better query performance
CREATE INDEX idx_master_txn_business_id ON master_txn_table(business_id);
CREATE INDEX idx_master_txn_date ON master_txn_table(transaction_date);
CREATE INDEX idx_master_txn_type ON master_txn_table(transaction_type);
CREATE INDEX idx_master_txn_customer ON master_txn_table(customers);
CREATE INDEX idx_master_txn_vendor ON master_txn_table(vendor);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_vendors_business_id ON vendors(business_id);
CREATE INDEX idx_chart_of_accounts_business_id ON chart_of_accounts(business_id); 