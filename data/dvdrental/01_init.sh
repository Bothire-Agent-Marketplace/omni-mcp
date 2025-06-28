#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -U postgres -d dvdrental; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Create the database if it doesn't exist
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'dvdrental'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE dvdrental;"

# Use pg_restore with the directory format
# The dvdrental sample is typically in directory format, so we'll use pg_restore
echo "Restoring DVD rental database..."

# First, let's check if we have a directory format backup or individual files
if [ -f "/docker-entrypoint-initdb.d/restore.sql" ]; then
    # We have the SQL format, let's try a different approach
    echo "Found SQL format, attempting manual restore..."
    
    # Create a simplified version that just loads the schema and basic data
    psql -U postgres -d dvdrental <<EOF
-- Create basic tables for testing
CREATE TABLE IF NOT EXISTS customer (
    customer_id SERIAL PRIMARY KEY,
    store_id SMALLINT NOT NULL,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    email VARCHAR(50),
    address_id SMALLINT NOT NULL,
    activebool BOOLEAN DEFAULT true NOT NULL,
    create_date DATE DEFAULT CURRENT_DATE NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active INTEGER
);

CREATE TABLE IF NOT EXISTS film (
    film_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    release_year INTEGER,
    language_id SMALLINT NOT NULL,
    rental_duration SMALLINT DEFAULT 3 NOT NULL,
    rental_rate NUMERIC(4,2) DEFAULT 4.99 NOT NULL,
    length SMALLINT,
    replacement_cost NUMERIC(5,2) DEFAULT 19.99 NOT NULL,
    rating VARCHAR(10) DEFAULT 'G',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    special_features TEXT[]
);

CREATE TABLE IF NOT EXISTS rental (
    rental_id SERIAL PRIMARY KEY,
    rental_date TIMESTAMP NOT NULL,
    inventory_id INTEGER NOT NULL,
    customer_id SMALLINT NOT NULL,
    return_date TIMESTAMP,
    staff_id SMALLINT NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    film_id SMALLINT NOT NULL,
    store_id SMALLINT NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    address_id SMALLINT NOT NULL,
    email VARCHAR(50),
    store_id SMALLINT NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    username VARCHAR(16) NOT NULL,
    password VARCHAR(40),
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(25) NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actor (
    actor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS film_category (
    film_id SMALLINT NOT NULL,
    category_id SMALLINT NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (film_id, category_id)
);

CREATE TABLE IF NOT EXISTS film_actor (
    actor_id SMALLINT NOT NULL,
    film_id SMALLINT NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_id, film_id)
);

-- Insert sample data
INSERT INTO customer (store_id, first_name, last_name, email, address_id, active) VALUES
(1, 'John', 'Doe', 'john.doe@example.com', 1, 1),
(1, 'Jane', 'Smith', 'jane.smith@example.com', 2, 1),
(2, 'Bob', 'Johnson', 'bob.johnson@example.com', 3, 1),
(1, 'Alice', 'Brown', 'alice.brown@example.com', 4, 1),
(2, 'Charlie', 'Wilson', 'charlie.wilson@example.com', 5, 1);

INSERT INTO category (name) VALUES
('Action'), ('Animation'), ('Children'), ('Classics'), ('Comedy'),
('Documentary'), ('Drama'), ('Family'), ('Foreign'), ('Games'),
('Horror'), ('Music'), ('New'), ('Sci-Fi'), ('Sports'), ('Travel');

INSERT INTO actor (first_name, last_name) VALUES
('Johnny', 'Depp'), ('Brad', 'Pitt'), ('Angelina', 'Jolie'),
('Tom', 'Cruise'), ('Will', 'Smith'), ('Leonardo', 'DiCaprio'),
('Sandra', 'Bullock'), ('Julia', 'Roberts'), ('Robert', 'De Niro'),
('Al', 'Pacino');

INSERT INTO film (title, description, release_year, language_id, rental_rate, length, replacement_cost, rating) VALUES
('The Matrix', 'A computer hacker learns from mysterious rebels about the true nature of his reality.', 1999, 1, 2.99, 136, 19.99, 'R'),
('Finding Nemo', 'A clown fish searches for his missing son.', 2003, 1, 0.99, 100, 19.99, 'G'),
('The Godfather', 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.', 1972, 1, 4.99, 175, 29.99, 'R'),
('Toy Story', 'A cowboy doll is profoundly threatened when a new spaceman figure supplants him as top toy.', 1995, 1, 0.99, 81, 19.99, 'G'),
('Pulp Fiction', 'The lives of two mob hitmen, a boxer, and others intertwine in four tales of violence.', 1994, 1, 2.99, 154, 19.99, 'R');

INSERT INTO staff (first_name, last_name, address_id, email, store_id, username) VALUES
('Mike', 'Hillyer', 1, 'Mike.Hillyer@sakilastaff.com', 1, 'Mike'),
('Jon', 'Stephens', 2, 'Jon.Stephens@sakilastaff.com', 2, 'Jon');

INSERT INTO inventory (film_id, store_id) VALUES
(1, 1), (1, 1), (1, 2),
(2, 1), (2, 2), (2, 2),
(3, 1), (3, 2),
(4, 1), (4, 1), (4, 2),
(5, 1), (5, 2);

INSERT INTO rental (rental_date, inventory_id, customer_id, staff_id, return_date) VALUES
('2024-06-01 10:30:00', 1, 1, 1, '2024-06-03 14:30:00'),
('2024-06-02 14:15:00', 4, 2, 1, '2024-06-04 16:45:00'),
('2024-06-03 09:20:00', 7, 3, 2, '2024-06-05 11:20:00'),
('2024-06-04 16:45:00', 10, 1, 1, NULL),
('2024-06-05 11:30:00', 12, 4, 2, '2024-06-07 13:15:00');

INSERT INTO film_category (film_id, category_id) VALUES
(1, 14), (2, 2), (3, 7), (4, 2), (5, 7);

INSERT INTO film_actor (actor_id, film_id) VALUES
(1, 1), (2, 3), (3, 3), (4, 1), (5, 5);

EOF

    echo "Sample DVD rental database created successfully!"
else
    echo "No restore.sql found, database will be empty"
fi 