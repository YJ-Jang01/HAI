import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

def get_db_connection():
    """
    Establishes a connection to the Supabase PostgreSQL database.
    """
    db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        print("❌ ERROR: DATABASE_URL not found. Check your .env file!")
        return None
        
    try:
        # Supabase requires SSL for remote connections
        conn = psycopg2.connect(db_url, sslmode='require')
        return conn
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        return None

# --- Connection Test ---
if __name__ == "__main__":
    print("Initiating Supabase Connection...")
    conn = get_db_connection()
    
    if conn:
        print("✅ Successfully connected to Supabase!")
        
        # Let's see what tables your backend team has migrated so far
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
            tables = cur.fetchall()
            
            print("\n📦 Available Public Tables:")
            if not tables:
                print("   (No tables found. The backend team might not have seeded the DB yet.)")
            else:
                for table in tables:
                    print(f"   - {table['table_name']}")
                    
            cur.close()
        except Exception as e:
            print(f"⚠️ Query failed: {e}")
        finally:
            conn.close()