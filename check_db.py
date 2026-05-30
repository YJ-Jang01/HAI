from ai.shared.db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Ask PostgreSQL for the columns in the product_reviews table
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_reviews';")

print("\n--- Columns in product_reviews ---")
for row in cur.fetchall():
    print(f" - {row[0]}")

conn.close()