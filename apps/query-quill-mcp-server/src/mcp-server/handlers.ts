import { z } from "zod";
import { Pool } from "pg";
import { envConfig } from "@mcp/utils";

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
  host: envConfig.POSTGRES_HOST,
  port: envConfig.POSTGRES_PORT,
  database: envConfig.POSTGRES_DB,
  user: envConfig.POSTGRES_USER,
  password: envConfig.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CustomerLookupSchema = z.object({
  search_term: z
    .string()
    .min(1)
    .describe("Customer email, name, or ID to search for"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of results to return"),
});

export const FilmInventorySchema = z.object({
  film_title: z
    .string()
    .min(1)
    .describe("Film title to search for (partial matches allowed)"),
  store_id: z
    .number()
    .min(1)
    .max(2)
    .optional()
    .describe("Store ID (1 or 2) to check inventory"),
});

export const RentalAnalysisSchema = z.object({
  customer_id: z.number().min(1).describe("Customer ID to analyze"),
  days_back: z
    .number()
    .min(1)
    .max(365)
    .default(30)
    .describe("Number of days to look back"),
});

export const PaymentInvestigationSchema = z.object({
  customer_id: z
    .number()
    .min(1)
    .optional()
    .describe("Customer ID to filter by"),
  min_amount: z.number().min(0).optional().describe("Minimum payment amount"),
  max_amount: z.number().min(0).optional().describe("Maximum payment amount"),
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of results"),
});

export const BusinessAnalyticsSchema = z.object({
  analysis_type: z
    .enum([
      "top_films_revenue",
      "customer_spending_patterns",
      "geographic_revenue",
      "category_performance",
      "monthly_trends",
      "inventory_utilization",
    ])
    .describe("Type of business analysis to perform"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Number of results to return"),
  time_period: z
    .string()
    .optional()
    .describe("Time period filter (e.g., '2022-01' for January 2022)"),
});

export const DatabaseHealthSchema = z.object({
  check_type: z
    .enum([
      "table_sizes",
      "connection_stats",
      "query_performance",
      "partition_info",
    ])
    .describe("Type of database health check to perform"),
});

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

export async function handleCustomerLookup(
  params: z.infer<typeof CustomerLookupSchema>
) {
  const { search_term, limit } = params;

  try {
    const query = `
      SELECT 
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.active,
        c.create_date,
        a.address,
        ci.city,
        co.country,
        s.store_id,
        COUNT(r.rental_id) as total_rentals,
        COALESCE(SUM(p.amount), 0) as total_spent,
        MAX(r.rental_date) as last_rental_date
      FROM customer c
      JOIN address a ON c.address_id = a.address_id
      JOIN city ci ON a.city_id = ci.city_id
      JOIN country co ON ci.country_id = co.country_id
      JOIN store s ON c.store_id = s.store_id
      LEFT JOIN rental r ON c.customer_id = r.customer_id
      LEFT JOIN payment p ON r.rental_id = p.rental_id
      WHERE 
        c.customer_id::text ILIKE $1 OR
        c.email ILIKE $1 OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $1 OR
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.active, 
               c.create_date, a.address, ci.city, co.country, s.store_id
      ORDER BY total_spent DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${search_term}%`, limit]);

    return {
      content: [
        {
          type: "text" as const,
          text:
            `Found ${result.rows.length} customer(s) matching "${search_term}":\n\n` +
            result.rows
              .map(
                (row) =>
                  `🆔 Customer ID: ${row.customer_id}\n` +
                  `👤 Name: ${row.first_name} ${row.last_name}\n` +
                  `📧 Email: ${row.email}\n` +
                  `🏪 Store: ${row.store_id}\n` +
                  `📍 Location: ${row.address}, ${row.city}, ${row.country}\n` +
                  `📊 Total Rentals: ${row.total_rentals}\n` +
                  `💰 Total Spent: $${parseFloat(row.total_spent).toFixed(
                    2
                  )}\n` +
                  `🕐 Last Rental: ${
                    row.last_rental_date
                      ? new Date(row.last_rental_date).toLocaleDateString()
                      : "Never"
                  }\n` +
                  `✅ Status: ${row.active ? "Active" : "Inactive"}\n` +
                  `📅 Member Since: ${new Date(
                    row.create_date
                  ).toLocaleDateString()}\n`
              )
              .join("\n---\n"),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Customer lookup failed: ${error.message}`);
  }
}

export async function handleFilmInventory(
  params: z.infer<typeof FilmInventorySchema>
) {
  const { film_title, store_id } = params;

  try {
    const query = `
      SELECT 
        f.film_id,
        f.title,
        f.description,
        f.release_year,
        f.rating,
        f.rental_rate,
        f.rental_duration,
        c.name as category,
        i.store_id,
        COUNT(i.inventory_id) as total_copies,
        COUNT(i.inventory_id) - COUNT(r.rental_id) as available_copies,
        COUNT(r.rental_id) as currently_rented,
        STRING_AGG(DISTINCT a.first_name || ' ' || a.last_name, ', ') as actors
      FROM film f
      JOIN film_category fc ON f.film_id = fc.film_id
      JOIN category c ON fc.category_id = c.category_id
      JOIN inventory i ON f.film_id = i.film_id
      LEFT JOIN rental r ON i.inventory_id = r.inventory_id AND r.return_date IS NULL
      LEFT JOIN film_actor fa ON f.film_id = fa.film_id
      LEFT JOIN actor a ON fa.actor_id = a.actor_id
      WHERE f.title ILIKE $1
      ${store_id ? "AND i.store_id = $2" : ""}
      GROUP BY f.film_id, f.title, f.description, f.release_year, f.rating, 
               f.rental_rate, f.rental_duration, c.name, i.store_id
      ORDER BY f.title, i.store_id
    `;

    const queryParams = store_id
      ? [`%${film_title}%`, store_id]
      : [`%${film_title}%`];
    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No films found matching "${film_title}"${
              store_id ? ` in store ${store_id}` : ""
            }`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text:
            `Found ${result.rows.length} inventory record(s) for films matching "${film_title}":\n\n` +
            result.rows
              .map(
                (row) =>
                  `🎬 Film: ${row.title} (${row.release_year})\n` +
                  `🆔 Film ID: ${row.film_id}\n` +
                  `🏪 Store: ${row.store_id}\n` +
                  `📝 Description: ${row.description.substring(0, 100)}...\n` +
                  `⭐ Rating: ${row.rating}\n` +
                  `🎭 Category: ${row.category}\n` +
                  `👥 Main Actors: ${row.actors}\n` +
                  `💰 Rental Rate: $${row.rental_rate}/day\n` +
                  `⏱️ Rental Duration: ${row.rental_duration} days\n` +
                  `📦 Total Copies: ${row.total_copies}\n` +
                  `✅ Available: ${row.available_copies}\n` +
                  `🔄 Currently Rented: ${row.currently_rented}\n`
              )
              .join("\n---\n"),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Film inventory lookup failed: ${error.message}`);
  }
}

export async function handleRentalAnalysis(
  params: z.infer<typeof RentalAnalysisSchema>
) {
  const { customer_id, days_back } = params;

  try {
    const query = `
      WITH customer_rentals AS (
        SELECT 
          r.rental_id,
          r.rental_date,
          r.return_date,
          f.title,
          f.rating,
          c.name as category,
          p.amount,
          s.first_name as staff_name,
          st.store_id,
          CASE 
            WHEN r.return_date IS NULL THEN 'CURRENTLY RENTED'
            WHEN r.return_date > r.rental_date + INTERVAL '1 day' * f.rental_duration THEN 'LATE RETURN'
            ELSE 'ON TIME'
          END as return_status
        FROM rental r
        JOIN inventory i ON r.inventory_id = i.inventory_id
        JOIN film f ON i.film_id = f.film_id
        JOIN film_category fc ON f.film_id = fc.film_id
        JOIN category c ON fc.category_id = c.category_id
        JOIN payment p ON r.rental_id = p.rental_id
        JOIN staff s ON r.staff_id = s.staff_id
        JOIN store st ON i.store_id = st.store_id
        WHERE r.customer_id = $1 
        AND r.rental_date >= CURRENT_DATE - INTERVAL '1 day' * $2
        ORDER BY r.rental_date DESC
      ),
      summary_stats AS (
        SELECT 
          COUNT(*) as total_rentals,
          SUM(amount) as total_spent,
          AVG(amount) as avg_spent_per_rental,
          COUNT(CASE WHEN return_status = 'LATE RETURN' THEN 1 END) as late_returns,
          COUNT(CASE WHEN return_status = 'CURRENTLY RENTED' THEN 1 END) as current_rentals,
          STRING_AGG(DISTINCT category, ', ') as favorite_categories
        FROM customer_rentals
      )
      SELECT 
        cr.*,
        ss.total_rentals,
        ss.total_spent,
        ss.avg_spent_per_rental,
        ss.late_returns,
        ss.current_rentals,
        ss.favorite_categories
      FROM customer_rentals cr
      CROSS JOIN summary_stats ss
    `;

    const result = await pool.query(query, [customer_id, days_back]);

    if (result.rows.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No rental activity found for customer ${customer_id} in the last ${days_back} days.`,
          },
        ],
      };
    }

    const firstRow = result.rows[0];
    const summary =
      `📊 RENTAL ANALYSIS SUMMARY (Last ${days_back} days)\n` +
      `👤 Customer ID: ${customer_id}\n` +
      `📽️ Total Rentals: ${firstRow.total_rentals}\n` +
      `💰 Total Spent: $${parseFloat(firstRow.total_spent).toFixed(2)}\n` +
      `💵 Average per Rental: $${parseFloat(
        firstRow.avg_spent_per_rental
      ).toFixed(2)}\n` +
      `⏰ Late Returns: ${firstRow.late_returns}\n` +
      `🔄 Current Rentals: ${firstRow.current_rentals}\n` +
      `🎭 Favorite Categories: ${firstRow.favorite_categories}\n\n`;

    const rentals = result.rows
      .map(
        (row) =>
          `🎬 ${row.title} (${row.rating})\n` +
          `📅 Rented: ${new Date(row.rental_date).toLocaleDateString()}\n` +
          `🔙 Returned: ${
            row.return_date
              ? new Date(row.return_date).toLocaleDateString()
              : "Still out"
          }\n` +
          `🏪 Store: ${row.store_id} | Staff: ${row.staff_name}\n` +
          `💰 Amount: $${row.amount}\n` +
          `📊 Status: ${row.return_status}\n`
      )
      .join("\n---\n");

    return {
      content: [
        {
          type: "text" as const,
          text: summary + "DETAILED RENTAL HISTORY:\n\n" + rentals,
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Rental analysis failed: ${error.message}`);
  }
}

export async function handlePaymentInvestigation(
  params: z.infer<typeof PaymentInvestigationSchema>
) {
  const { customer_id, min_amount, max_amount, start_date, end_date, limit } =
    params;

  try {
    let whereConditions = ["1=1"];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (customer_id) {
      whereConditions.push(`p.customer_id = $${paramIndex}`);
      queryParams.push(customer_id);
      paramIndex++;
    }

    if (min_amount) {
      whereConditions.push(`p.amount >= $${paramIndex}`);
      queryParams.push(min_amount);
      paramIndex++;
    }

    if (max_amount) {
      whereConditions.push(`p.amount <= $${paramIndex}`);
      queryParams.push(max_amount);
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`p.payment_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`p.payment_date <= $${paramIndex}`);
      queryParams.push(end_date + " 23:59:59");
      paramIndex++;
    }

    queryParams.push(limit);

    const query = `
      SELECT 
        p.payment_id,
        p.payment_date,
        p.amount,
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        f.title as film_title,
        s.first_name as staff_name,
        st.store_id,
        r.rental_date,
        r.return_date
      FROM payment p
      JOIN customer c ON p.customer_id = c.customer_id
      JOIN rental r ON p.rental_id = r.rental_id
      JOIN inventory i ON r.inventory_id = i.inventory_id
      JOIN film f ON i.film_id = f.film_id
      JOIN staff s ON p.staff_id = s.staff_id
      JOIN store st ON s.store_id = st.store_id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY p.payment_date DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, queryParams);

    const totalAmount = result.rows.reduce(
      (sum, row) => sum + parseFloat(row.amount),
      0
    );

    return {
      content: [
        {
          type: "text" as const,
          text:
            `💳 PAYMENT INVESTIGATION RESULTS\n\n` +
            `📊 Found ${result.rows.length} payment(s)\n` +
            `💰 Total Amount: $${totalAmount.toFixed(2)}\n\n` +
            result.rows
              .map(
                (row) =>
                  `🆔 Payment ID: ${row.payment_id}\n` +
                  `📅 Date: ${new Date(row.payment_date).toLocaleString()}\n` +
                  `💵 Amount: $${row.amount}\n` +
                  `👤 Customer: ${row.first_name} ${row.last_name} (ID: ${row.customer_id})\n` +
                  `📧 Email: ${row.email}\n` +
                  `🎬 Film: ${row.film_title}\n` +
                  `🏪 Store: ${row.store_id} | Staff: ${row.staff_name}\n` +
                  `📅 Rental: ${new Date(
                    row.rental_date
                  ).toLocaleDateString()}\n` +
                  `🔙 Returned: ${
                    row.return_date
                      ? new Date(row.return_date).toLocaleDateString()
                      : "Not returned"
                  }\n`
              )
              .join("\n---\n"),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Payment investigation failed: ${error.message}`);
  }
}

export async function handleBusinessAnalytics(
  params: z.infer<typeof BusinessAnalyticsSchema>
) {
  const { analysis_type, limit, time_period } = params;

  try {
    let query = "";
    let queryParams: any[] = [limit];

    switch (analysis_type) {
      case "top_films_revenue":
        query = `
          SELECT 
            f.title,
            f.rating,
            c.name as category,
            COUNT(r.rental_id) as rental_count,
            SUM(p.amount) as total_revenue,
            AVG(p.amount) as avg_rental_price
          FROM film f
          JOIN inventory i ON f.film_id = i.film_id
          JOIN rental r ON i.inventory_id = r.inventory_id
          JOIN payment p ON r.rental_id = p.rental_id
          JOIN film_category fc ON f.film_id = fc.film_id
          JOIN category c ON fc.category_id = c.category_id
          GROUP BY f.film_id, f.title, f.rating, c.name
          ORDER BY total_revenue DESC
          LIMIT $1
        `;
        break;

      case "customer_spending_patterns":
        query = `
          SELECT 
            c.customer_id,
            c.first_name,
            c.last_name,
            co.country,
            ci.city,
            COUNT(r.rental_id) as total_rentals,
            SUM(p.amount) as total_spent,
            AVG(p.amount) as avg_per_rental,
            STRING_AGG(DISTINCT cat.name, ', ') as favorite_categories
          FROM customer c
          JOIN address a ON c.address_id = a.address_id
          JOIN city ci ON a.city_id = ci.city_id
          JOIN country co ON ci.country_id = co.country_id
          JOIN rental r ON c.customer_id = r.customer_id
          JOIN payment p ON r.rental_id = p.rental_id
          JOIN inventory i ON r.inventory_id = i.inventory_id
          JOIN film f ON i.film_id = f.film_id
          JOIN film_category fc ON f.film_id = fc.film_id
          JOIN category cat ON fc.category_id = cat.category_id
          GROUP BY c.customer_id, c.first_name, c.last_name, co.country, ci.city
          ORDER BY total_spent DESC
          LIMIT $1
        `;
        break;

      case "geographic_revenue":
        query = `
          SELECT 
            co.country,
            ci.city,
            COUNT(DISTINCT c.customer_id) as customer_count,
            COUNT(r.rental_id) as total_rentals,
            SUM(p.amount) as total_revenue,
            AVG(p.amount) as avg_transaction
          FROM payment p
          JOIN rental r ON p.rental_id = r.rental_id
          JOIN customer c ON r.customer_id = c.customer_id
          JOIN address a ON c.address_id = a.address_id
          JOIN city ci ON a.city_id = ci.city_id
          JOIN country co ON ci.country_id = co.country_id
          GROUP BY co.country, ci.city
          ORDER BY total_revenue DESC
          LIMIT $1
        `;
        break;

      case "category_performance":
        query = `
          SELECT 
            c.name as category,
            COUNT(DISTINCT f.film_id) as film_count,
            COUNT(r.rental_id) as total_rentals,
            SUM(p.amount) as total_revenue,
            AVG(p.amount) as avg_rental_price,
            AVG(f.rental_rate) as avg_base_rate
          FROM category c
          JOIN film_category fc ON c.category_id = fc.category_id
          JOIN film f ON fc.film_id = f.film_id
          JOIN inventory i ON f.film_id = i.film_id
          JOIN rental r ON i.inventory_id = r.inventory_id
          JOIN payment p ON r.rental_id = p.rental_id
          GROUP BY c.category_id, c.name
          ORDER BY total_revenue DESC
          LIMIT $1
        `;
        break;

      case "monthly_trends":
        query = `
          SELECT 
            DATE_TRUNC('month', p.payment_date) as month,
            COUNT(DISTINCT c.customer_id) as unique_customers,
            COUNT(r.rental_id) as total_rentals,
            SUM(p.amount) as total_revenue,
            AVG(p.amount) as avg_transaction
          FROM payment p
          JOIN rental r ON p.rental_id = r.rental_id
          JOIN customer c ON r.customer_id = c.customer_id
          ${
            time_period
              ? "WHERE DATE_TRUNC('month', p.payment_date) = $2::date"
              : ""
          }
          GROUP BY DATE_TRUNC('month', p.payment_date)
          ORDER BY month DESC
          LIMIT $1
        `;
        if (time_period) {
          queryParams.push(time_period + "-01");
        }
        break;

      case "inventory_utilization":
        query = `
          SELECT 
            s.store_id,
            f.title,
            c.name as category,
            COUNT(i.inventory_id) as total_copies,
            COUNT(r.rental_id) as total_rentals,
            ROUND(COUNT(r.rental_id)::numeric / COUNT(i.inventory_id), 2) as utilization_ratio
          FROM store s
          JOIN inventory i ON s.store_id = i.store_id
          JOIN film f ON i.film_id = f.film_id
          JOIN film_category fc ON f.film_id = fc.film_id
          JOIN category c ON fc.category_id = c.category_id
          LEFT JOIN rental r ON i.inventory_id = r.inventory_id
          GROUP BY s.store_id, f.film_id, f.title, c.name
          HAVING COUNT(i.inventory_id) > 0
          ORDER BY utilization_ratio DESC
          LIMIT $1
        `;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysis_type}`);
    }

    const result = await pool.query(query, queryParams);

    const analysisTitle = analysis_type.replace(/_/g, " ").toUpperCase();

    return {
      content: [
        {
          type: "text" as const,
          text:
            `📈 ${analysisTitle} ANALYSIS\n\n` +
            `Found ${result.rows.length} result(s):\n\n` +
            result.rows
              .map((row, index) => {
                let output = `${index + 1}. `;

                Object.entries(row).forEach(([key, value]) => {
                  if (value !== null) {
                    if (
                      key.includes("revenue") ||
                      key.includes("amount") ||
                      key.includes("spent")
                    ) {
                      output += `${key}: $${parseFloat(value as string).toFixed(
                        2
                      )} | `;
                    } else if (key.includes("date") || key === "month") {
                      output += `${key}: ${new Date(
                        value as string
                      ).toLocaleDateString()} | `;
                    } else {
                      output += `${key}: ${value} | `;
                    }
                  }
                });

                return output.slice(0, -3); // Remove trailing " | "
              })
              .join("\n"),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Business analytics failed: ${error.message}`);
  }
}

export async function handleDatabaseHealth(
  params: z.infer<typeof DatabaseHealthSchema>
) {
  const { check_type } = params;

  try {
    let query = "";

    switch (check_type) {
      case "table_sizes":
        query = `
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY size_bytes DESC
        `;
        break;

      case "connection_stats":
        query = `
          SELECT 
            state,
            COUNT(*) as connection_count,
            string_agg(DISTINCT usename, ', ') as users
          FROM pg_stat_activity 
          WHERE datname = current_database()
          GROUP BY state
          ORDER BY connection_count DESC
        `;
        break;

      case "query_performance":
        query = `
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements 
          WHERE query NOT LIKE '%pg_stat%'
          ORDER BY total_time DESC
          LIMIT 10
        `;
        break;

      case "partition_info":
        query = `
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE tablename LIKE 'payment_p%'
          ORDER BY tablename
        `;
        break;

      default:
        throw new Error(`Unknown check type: ${check_type}`);
    }

    const result = await pool.query(query);
    const checkTitle = check_type.replace(/_/g, " ").toUpperCase();

    return {
      content: [
        {
          type: "text" as const,
          text:
            `🔧 DATABASE ${checkTitle} CHECK\n\n` +
            `Found ${result.rows.length} result(s):\n\n` +
            result.rows
              .map((row, index) => {
                let output = `${index + 1}. `;
                Object.entries(row).forEach(([key, value]) => {
                  output += `${key}: ${value} | `;
                });
                return output.slice(0, -3);
              })
              .join("\n"),
        },
      ],
    };
  } catch (error: any) {
    // Graceful fallback for missing extensions
    if (error.message.includes("pg_stat_statements")) {
      return {
        content: [
          {
            type: "text" as const,
            text: `⚠️ Database health check failed: pg_stat_statements extension not available.\nThis is normal for development environments.`,
          },
        ],
      };
    }
    throw new Error(`Database health check failed: ${error.message}`);
  }
}

// Test connection on module load
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
  }
});
