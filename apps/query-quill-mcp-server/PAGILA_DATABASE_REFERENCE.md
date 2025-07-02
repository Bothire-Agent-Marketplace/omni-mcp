# 🎬 Pagila Database Schema Reference

> PostgreSQL 17 database with DVD rental store sample data - 16,049+ records across 24 tables

## 📊 **Database Overview**

The Pagila database is a PostgreSQL version of the popular Sakila sample database, representing a
DVD rental business. It contains realistic business data with complex relationships perfect for
demonstrating advanced SQL queries.

### **🎯 Key Business Entities**

- **Films**: 1,000 movies with ratings, categories, and rental information
- **Customers**: 599 customers with addresses and rental history
- **Actors**: 200 actors with film relationships
- **Rentals**: 16,044 rental transactions
- **Payments**: 16,049 payment records (partitioned by month)
- **Inventory**: 4,581 inventory items across 2 stores

## 🏗️ **Core Table Structure**

### **🎭 Content Tables**

```sql
-- Films (1,000 records)
film: film_id, title, description, release_year, language_id, rental_duration, rental_rate, length, replacement_cost, rating, special_features

-- Actors (200 records)
actor: actor_id, first_name, last_name, last_update

-- Categories (16 records)
category: category_id, name, last_update

-- Languages (6 records)
language: language_id, name, last_update
```

### **👥 Customer & Location Tables**

```sql
-- Customers (599 records)
customer: customer_id, store_id, first_name, last_name, email, address_id, active, create_date, last_update

-- Addresses (603 records)
address: address_id, address, address2, district, city_id, postal_code, phone, last_update

-- Cities (600 records)
city: city_id, city, country_id, last_update

-- Countries (109 records)
country: country_id, country, last_update
```

### **🏪 Business Operations Tables**

```sql
-- Stores (2 records)
store: store_id, manager_staff_id, address_id, last_update

-- Staff (2 records)
staff: staff_id, first_name, last_name, address_id, email, store_id, active, username, password, last_update

-- Inventory (4,581 records)
inventory: inventory_id, film_id, store_id, last_update

-- Rentals (16,044 records)
rental: rental_id, rental_date, inventory_id, customer_id, return_date, staff_id, last_update
```

### **💰 Financial Tables (Partitioned)**

```sql
-- Payment (Master Table - Partitioned)
payment: payment_id, customer_id, staff_id, rental_id, amount, payment_date

-- Monthly Partitions (2022)
payment_p2022_01, payment_p2022_02, payment_p2022_03, payment_p2022_04,
payment_p2022_05, payment_p2022_06, payment_p2022_07
```

### **🔗 Relationship Tables**

```sql
-- Film-Actor Relationships (5,462 records)
film_actor: actor_id, film_id, last_update

-- Film-Category Relationships (1,000 records)
film_category: film_id, category_id, last_update
```

## 🔗 **Foreign Key Relationships**

### **Geographic Hierarchy**

```
country → city → address → customer/staff/store
```

### **Content Relationships**

```
language → film ← film_category → category
         ↑
    film_actor → actor
         ↓
    inventory → rental → payment
```

### **Business Flow**

```
store → inventory → rental ← customer
  ↓        ↓         ↓
staff → rental → payment
```

## 🎯 **Common Query Patterns**

### **📈 Business Analytics Queries**

#### **Top Performing Films**

```sql
SELECT f.title, COUNT(r.rental_id) as rental_count, SUM(p.amount) as total_revenue
FROM film f
JOIN inventory i ON f.film_id = i.film_id
JOIN rental r ON i.inventory_id = r.inventory_id
JOIN payment p ON r.rental_id = p.rental_id
GROUP BY f.film_id, f.title
ORDER BY total_revenue DESC
LIMIT 10;
```

#### **Customer Rental Patterns**

```sql
SELECT c.first_name, c.last_name, COUNT(r.rental_id) as rentals,
       SUM(p.amount) as total_spent
FROM customer c
JOIN rental r ON c.customer_id = r.customer_id
JOIN payment p ON r.rental_id = p.rental_id
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_spent DESC;
```

#### **Geographic Revenue Analysis**

```sql
SELECT co.country, ci.city, SUM(p.amount) as revenue
FROM payment p
JOIN rental r ON p.rental_id = r.rental_id
JOIN customer c ON r.customer_id = c.customer_id
JOIN address a ON c.address_id = a.address_id
JOIN city ci ON a.city_id = ci.city_id
JOIN country co ON ci.country_id = co.country_id
GROUP BY co.country, ci.city
ORDER BY revenue DESC;
```

### **🎬 Content Discovery Queries**

#### **Films by Category and Rating**

```sql
SELECT c.name as category, f.rating, COUNT(*) as film_count
FROM film f
JOIN film_category fc ON f.film_id = fc.film_id
JOIN category c ON fc.category_id = c.category_id
GROUP BY c.name, f.rating
ORDER BY c.name, f.rating;
```

#### **Actor Filmography**

```sql
SELECT a.first_name, a.last_name, f.title, f.release_year, c.name as category
FROM actor a
JOIN film_actor fa ON a.actor_id = fa.actor_id
JOIN film f ON fa.film_id = f.film_id
JOIN film_category fc ON f.film_id = fc.film_id
JOIN category c ON fc.category_id = c.category_id
WHERE a.first_name = 'PENELOPE' AND a.last_name = 'GUINESS'
ORDER BY f.release_year;
```

### **⏰ Time-based Analysis**

#### **Monthly Revenue (Partitioned Tables)**

```sql
SELECT DATE_TRUNC('month', payment_date) as month, SUM(amount) as revenue
FROM payment
WHERE payment_date >= '2022-01-01' AND payment_date < '2022-08-01'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month;
```

#### **Rental Duration Analysis**

```sql
SELECT f.title, AVG(r.return_date - r.rental_date) as avg_rental_duration
FROM film f
JOIN inventory i ON f.film_id = i.film_id
JOIN rental r ON i.inventory_id = r.inventory_id
WHERE r.return_date IS NOT NULL
GROUP BY f.film_id, f.title
ORDER BY avg_rental_duration DESC;
```

## 🔧 **Advanced PostgreSQL Features**

### **Full-Text Search**

```sql
-- Films have a fulltext tsvector column for search
SELECT title, description
FROM film
WHERE fulltext @@ to_tsquery('comedy & action');
```

### **Array Operations**

```sql
-- Special features are stored as arrays
SELECT title, special_features
FROM film
WHERE 'Trailers' = ANY(special_features);
```

### **Custom Types**

```sql
-- MPAA rating is a custom enum type
SELECT rating, COUNT(*)
FROM film
GROUP BY rating
ORDER BY rating;
```

### **JSON Data (Extended Tables)**

```sql
-- Modern additions with JSONB columns
SELECT * FROM packages_apt_postgresql_org WHERE aptdata @> '{"name": "postgresql"}';
```

## 🎯 **Recommended MCP Tools**

Based on this schema, the query-quill MCP server should provide tools for:

1. **📊 Business Analytics**
   - Revenue analysis by time, location, customer
   - Film performance metrics
   - Customer behavior patterns

2. **🔍 Content Discovery**
   - Film search by title, category, actor
   - Actor filmography
   - Category analysis

3. **💰 Financial Reporting**
   - Payment analysis across partitions
   - Rental profitability
   - Store performance comparison

4. **📈 Operational Metrics**
   - Inventory utilization
   - Staff performance
   - Return date analysis

This rich dataset provides excellent opportunities for complex JOIN operations, aggregations, window
functions, and PostgreSQL-specific features like full-text search and JSON operations.
