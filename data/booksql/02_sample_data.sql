-- Sample Data for BookSQL Accounting Database
-- This creates realistic accounting data for multiple businesses

-- Insert Chart of Accounts
INSERT INTO chart_of_accounts (business_id, account_name, account_type) VALUES
-- Business 1 - Tech Startup
(1, 'cash', 'asset'),
(1, 'accounts receivable', 'asset'),
(1, 'inventory', 'asset'),
(1, 'equipment', 'asset'),
(1, 'accounts payable', 'liability'),
(1, 'credit card', 'liability'),
(1, 'revenue', 'income'),
(1, 'cost of goods sold', 'expense'),
(1, 'office expenses', 'expense'),
(1, 'marketing', 'expense'),

-- Business 2 - Consulting Firm
(2, 'cash', 'asset'),
(2, 'accounts receivable', 'asset'),
(2, 'office equipment', 'asset'),
(2, 'accounts payable', 'liability'),
(2, 'consulting revenue', 'income'),
(2, 'travel expenses', 'expense'),
(2, 'professional services', 'expense'),

-- Business 3 - Retail Store
(3, 'cash', 'asset'),
(3, 'inventory', 'asset'),
(3, 'store equipment', 'asset'),
(3, 'accounts payable', 'liability'),
(3, 'sales revenue', 'income'),
(3, 'rent expense', 'expense'),
(3, 'utilities', 'expense');

-- Insert Customers
INSERT INTO customers (business_id, customer_name, customer_full_name, billing_address, billing_city, billing_state, billing_zip_code, balance) VALUES
-- Business 1 customers
(1, 'acme corp', 'ACME Corporation', '123 Business St', 'San Francisco', 'CA', '94105', 15000.00),
(1, 'tech solutions inc', 'Tech Solutions Inc.', '456 Innovation Dr', 'Palo Alto', 'CA', '94301', 8500.00),
(1, 'startup ventures', 'Startup Ventures LLC', '789 Venture Blvd', 'Mountain View', 'CA', '94041', 12000.00),
(1, 'global systems', 'Global Systems Ltd', '321 Enterprise Way', 'San Jose', 'CA', '95110', 0.00),

-- Business 2 customers
(2, 'fortune 500 co', 'Fortune 500 Company', '100 Corporate Plaza', 'New York', 'NY', '10001', 25000.00),
(2, 'mid-size business', 'Mid-Size Business Inc', '200 Main Street', 'Chicago', 'IL', '60601', 5000.00),
(2, 'nonprofit org', 'Nonprofit Organization', '300 Charity Lane', 'Boston', 'MA', '02101', 0.00),

-- Business 3 customers
(3, 'walk-in customer', 'Walk-in Customer', 'N/A', 'N/A', 'N/A', 'N/A', 0.00),
(3, 'loyal customer', 'Loyal Customer', '400 Residential St', 'Austin', 'TX', '73301', 150.00);

-- Insert Vendors
INSERT INTO vendors (business_id, vendor_name, billing_address, billing_city, billing_state, billing_zip_code, balance) VALUES
-- Business 1 vendors
(1, 'office supplies plus', '500 Supply Chain Dr', 'Oakland', 'CA', '94607', 2500.00),
(1, 'cloud hosting services', '600 Server Farm Rd', 'Seattle', 'WA', '98101', 1200.00),
(1, 'marketing agency', '700 Creative Ave', 'Los Angeles', 'CA', '90210', 5000.00),

-- Business 2 vendors
(2, 'travel booking inc', '800 Travel Plaza', 'Denver', 'CO', '80201', 800.00),
(2, 'office lease company', '900 Property Mgmt St', 'Phoenix', 'AZ', '85001', 3000.00),

-- Business 3 vendors
(3, 'wholesale distributor', '1000 Warehouse Blvd', 'Dallas', 'TX', '75201', 15000.00),
(3, 'utility company', '1100 Power Grid St', 'Houston', 'TX', '77001', 450.00);

-- Insert Employees
INSERT INTO employees (business_id, employee_name, employee_id, hire_date, billing_rate) VALUES
-- Business 1 employees
(1, 'john smith', 'EMP001', '2023-01-15', 75.00),
(1, 'sarah johnson', 'EMP002', '2023-02-01', 85.00),
(1, 'mike davis', 'EMP003', '2023-03-15', 65.00),

-- Business 2 employees
(2, 'lisa wilson', 'CON001', '2022-06-01', 150.00),
(2, 'david brown', 'CON002', '2022-08-15', 125.00),

-- Business 3 employees
(3, 'emma garcia', 'RET001', '2023-01-01', 20.00),
(3, 'james martinez', 'RET002', '2023-02-15', 22.00);

-- Insert Products/Services
INSERT INTO products (business_id, product_service, product_service_type) VALUES
-- Business 1 products/services
(1, 'software development', 'service'),
(1, 'mobile app', 'product'),
(1, 'web platform', 'product'),
(1, 'consulting hours', 'service'),

-- Business 2 services
(2, 'business consulting', 'service'),
(2, 'strategy planning', 'service'),
(2, 'process optimization', 'service'),

-- Business 3 products
(3, 'electronics', 'product'),
(3, 'accessories', 'product'),
(3, 'warranty service', 'service');

-- Insert Payment Methods
INSERT INTO payment_method (business_id, payment_method, credit_card) VALUES
-- Business 1
(1, 'credit card', 'visa'),
(1, 'bank transfer', null),
(1, 'check', null),
(1, 'paypal', null),

-- Business 2
(2, 'credit card', 'mastercard'),
(2, 'bank transfer', null),
(2, 'check', null),

-- Business 3
(3, 'cash', null),
(3, 'credit card', 'visa'),
(3, 'debit card', null),
(3, 'check', null),
(3, 'bank transfer', null);

-- Insert Master Transactions (realistic accounting entries)
INSERT INTO master_txn_table (
    business_id, transaction_id, transaction_date, transaction_type, amount, 
    created_date, created_user, account, customers, vendor, product_service, 
    quantity, rate, credit, debit, payment_method
) VALUES
-- Business 1 - Tech Startup Transactions
(1, 1001, '2024-01-15', 'invoice', 15000.00, '2024-01-15', 'john smith', 'accounts receivable', 'acme corp', null, 'software development', 200, 75.00, 15000.00, 0.00, 'credit card'),
(1, 1002, '2024-01-20', 'payment', 15000.00, '2024-01-20', 'sarah johnson', 'cash', 'acme corp', null, null, null, null, 0.00, 15000.00, 'bank transfer'),
(1, 1003, '2024-01-25', 'expense', 2500.00, '2024-01-25', 'mike davis', 'office expenses', null, 'office supplies plus', null, null, null, 2500.00, 0.00, 'credit card'),
(1, 1004, '2024-02-01', 'invoice', 8500.00, '2024-02-01', 'john smith', 'accounts receivable', 'tech solutions inc', null, 'mobile app', 1, 8500.00, 8500.00, 0.00, 'check'),
(1, 1005, '2024-02-05', 'expense', 1200.00, '2024-02-05', 'sarah johnson', 'office expenses', null, 'cloud hosting services', null, null, null, 1200.00, 0.00, 'bank transfer'),

-- Business 2 - Consulting Firm Transactions
(2, 2001, '2024-01-10', 'invoice', 25000.00, '2024-01-10', 'lisa wilson', 'accounts receivable', 'fortune 500 co', null, 'business consulting', 100, 250.00, 25000.00, 0.00, 'bank transfer'),
(2, 2002, '2024-01-15', 'payment', 25000.00, '2024-01-15', 'david brown', 'cash', 'fortune 500 co', null, null, null, null, 0.00, 25000.00, 'bank transfer'),
(2, 2003, '2024-01-20', 'expense', 800.00, '2024-01-20', 'lisa wilson', 'travel expenses', null, 'travel booking inc', null, null, null, 800.00, 0.00, 'credit card'),
(2, 2004, '2024-02-01', 'invoice', 5000.00, '2024-02-01', 'david brown', 'accounts receivable', 'mid-size business', null, 'strategy planning', 40, 125.00, 5000.00, 0.00, 'check'),

-- Business 3 - Retail Store Transactions
(3, 3001, '2024-01-12', 'sale', 1200.00, '2024-01-12', 'emma garcia', 'cash', 'walk-in customer', null, 'electronics', 3, 400.00, 0.00, 1200.00, 'cash'),
(3, 3002, '2024-01-15', 'expense', 15000.00, '2024-01-15', 'james martinez', 'inventory', null, 'wholesale distributor', 'electronics', 50, 300.00, 15000.00, 0.00, 'check'),
(3, 3003, '2024-01-20', 'sale', 850.00, '2024-01-20', 'emma garcia', 'cash', 'loyal customer', null, 'accessories', 5, 170.00, 0.00, 850.00, 'credit card'),
(3, 3004, '2024-01-25', 'expense', 450.00, '2024-01-25', 'james martinez', 'utilities', null, 'utility company', null, null, null, 450.00, 0.00, 'bank transfer');

-- Add more recent transactions for better query variety
INSERT INTO master_txn_table (
    business_id, transaction_id, transaction_date, transaction_type, amount, 
    created_date, created_user, account, customers, vendor, product_service, 
    quantity, rate, credit, debit, payment_method, due_date, open_balance
) VALUES
-- More transactions with due dates and open balances
(1, 1006, '2024-02-10', 'invoice', 12000.00, '2024-02-10', 'john smith', 'accounts receivable', 'startup ventures', null, 'web platform', 1, 12000.00, 12000.00, 0.00, 'bank transfer', '2024-03-10', 12000.00),
(1, 1007, '2024-02-15', 'expense', 5000.00, '2024-02-15', 'sarah johnson', 'marketing', null, 'marketing agency', null, null, null, 5000.00, 0.00, 'credit card', '2024-03-15', 5000.00),
(2, 2005, '2024-02-05', 'expense', 3000.00, '2024-02-05', 'lisa wilson', 'professional services', null, 'office lease company', null, null, null, 3000.00, 0.00, 'check', '2024-03-05', 3000.00),
(3, 3005, '2024-02-01', 'sale', 2400.00, '2024-02-01', 'emma garcia', 'cash', 'loyal customer', null, 'electronics', 6, 400.00, 0.00, 2400.00, 'debit card', null, 0.00);

-- Update customer and vendor balances based on transactions
UPDATE customers SET balance = 12000.00 WHERE business_id = 1 AND customer_name = 'startup ventures';
UPDATE customers SET balance = 8500.00 WHERE business_id = 1 AND customer_name = 'tech solutions inc';
UPDATE customers SET balance = 5000.00 WHERE business_id = 2 AND customer_name = 'mid-size business';
UPDATE customers SET balance = 150.00 WHERE business_id = 3 AND customer_name = 'loyal customer';

UPDATE vendors SET balance = 2500.00 WHERE business_id = 1 AND vendor_name = 'office supplies plus';
UPDATE vendors SET balance = 1200.00 WHERE business_id = 1 AND vendor_name = 'cloud hosting services';
UPDATE vendors SET balance = 5000.00 WHERE business_id = 1 AND vendor_name = 'marketing agency';
UPDATE vendors SET balance = 800.00 WHERE business_id = 2 AND vendor_name = 'travel booking inc';
UPDATE vendors SET balance = 3000.00 WHERE business_id = 2 AND vendor_name = 'office lease company';
UPDATE vendors SET balance = 15000.00 WHERE business_id = 3 AND vendor_name = 'wholesale distributor';
UPDATE vendors SET balance = 450.00 WHERE business_id = 3 AND vendor_name = 'utility company'; 