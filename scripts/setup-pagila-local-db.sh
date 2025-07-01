#!/bin/bash

# Setup Local PostgreSQL Database for Omni MCP
# This script sets up the Pagila sample database locally

set -e

echo "🗄️  Setting up local PostgreSQL database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL service is not running. Please start it:"
    echo "   macOS: brew services start postgresql"
    echo "   Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Ensure data directory exists
mkdir -p data

# Check if Pagila data exists, if not clone it
if [ ! -d "data/pagila" ] || [ ! -f "data/pagila/pagila-schema.sql" ]; then
    echo "📥 Pagila sample database not found. Cloning from GitHub..."
    
    # Remove existing directory if it's incomplete
    if [ -d "data/pagila" ]; then
        rm -rf data/pagila
    fi
    
    # Clone the Pagila repository
    git clone https://github.com/devrimgunduz/pagila.git data/pagila
    
    # Remove the .git directory to avoid nested git repositories
    rm -rf data/pagila/.git
    
    echo "✅ Pagila sample database downloaded successfully"
else
    echo "✅ Pagila sample database already exists"
fi

# Database configuration
DB_NAME="pagila"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "📊 Database configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to recreate it? This will delete all existing data. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
    else
        echo "✅ Using existing database."
        exit 0
    fi
fi

# Create database
echo "🏗️  Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

# Load schema
echo "📋 Loading Pagila schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "data/pagila/pagila-schema.sql"

# Load data
echo "📦 Loading Pagila data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "data/pagila/pagila-data.sql"

echo "✅ Database setup complete!"
echo ""
echo "🔗 Connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""
echo "📝 To connect manually:"
echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
echo "🧪 Test query:"
echo "   SELECT COUNT(*) FROM film;" 