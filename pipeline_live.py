import json
import re
import os
from importlib.machinery import SourceFileLoader
from psycopg2.extras import RealDictCursor
from ai.shared.db import get_db_connection

# 1. Dynamically load the agents because their folder names contain hyphens
nl_agent = SourceFileLoader("nl_agent", "ai/nl-request-agent/agent.py").load_module()
display_agent = SourceFileLoader("display_agent", "ai/display-agent/agent.py").load_module()

def build_sql_from_constraints(range_constraints: list) -> str:
    """
    Translates the AI's numeric interpretations into SQL WHERE clauses
    based on the exact Amazon demo schema.
    """
    sql_clauses = []
    
    for constraint in range_constraints:
        param = constraint.get("parameter_name", "").lower()
        numeric_str = constraint.get("numeric_interpretation", "")
        
        # Extract operators (<, >, <=, >=) and numbers using regex
        match = re.search(r'([<>]=?)\s*\$?(\d+\.?\d*)', numeric_str)
        if match:
            operator = match.group(1)
            value = match.group(2)
            
            # Map to the specific schema columns
            if param == "price":
                sql_clauses.append(f"price_amount {operator} {value}")
            elif param == "rating":
                sql_clauses.append(f"rating {operator} {value}")
                
    if sql_clauses:
        return "WHERE " + " AND ".join(sql_clauses)
    return ""

def run_live_pipeline():
    print("🚀 Starting Live GroundedCompare Pipeline...\n")
    
    user_prompt = "Show me winter coats that are not too expensive and have good reviews"
    screen_context = "Category: Outerwear. Price range: $45 to $350. Average rating: 4.1."
    
    print(f"👤 USER: {user_prompt}")
    
    # ---------------------------------------------------------
    # 1. NL Request Agent (Human -> Intent)
    # ---------------------------------------------------------
    print("🧠 1. NL Request Agent processing...")
    nl_response_str = nl_agent.parse_user_command(user_prompt, screen_context)
    nl_intent = json.loads(nl_response_str)
    
    # ---------------------------------------------------------
    # 2. Intent -> SQL
    # ---------------------------------------------------------
    print("\n⚙️ 2. Translating Intent to SQL...")
    constraints = nl_intent.get("rangeConstraints", [])
    sql_where = build_sql_from_constraints(constraints)
    
    # Using 'name' and 'price_amount' based on the Drizzle schema
    target_sql = f"SELECT id, name, price_amount, rating FROM products {sql_where} LIMIT 2;"
    print(f"   Generated SQL: {target_sql}")
    
    # ---------------------------------------------------------
    # 3. Live Supabase Fetch
    # ---------------------------------------------------------
    print("\n🌍 3. Fetching from Supabase...")
    conn = get_db_connection()
    if not conn:
        return

    raw_reviews_str = ""
    target_items = []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Fetch the filtered products
        cur.execute(target_sql)
        products = cur.fetchall()
        
        if not products:
            print("   ⚠️ No products matched those constraints in the DB.")
            return
            
        # Fetch reviews for those specific products
        for p in products:
            prod_id = p['id']
            target_items.append(prod_id)
            
            # Using parameterized query for safety
            cur.execute("SELECT body FROM product_reviews WHERE product_id = %s LIMIT 3;", (prod_id,))
            reviews = cur.fetchall()
            
            # Format the data for Gemini using the correct schema keys
            review_texts = [r['body'] for r in reviews]
            raw_reviews_str += f"Product {prod_id} ({p['name']}, ${p['price_amount']}, Rating {p['rating']}): {review_texts}\n"
            
        print(f"   Fetched {len(products)} products and their reviews.")
        cur.close()
    except Exception as e:
        print(f"❌ DB Query Failed: {e}")
        return
    finally:
        conn.close()

    # ---------------------------------------------------------
    # 4. Display Agent (Data -> UI)
    # ---------------------------------------------------------
    print("\n🎨 4. Display Agent synthesizing UI payload...")
    display_response_str = display_agent.generate_display_payload(
        target_items=target_items,
        feature_focus=user_prompt,
        raw_reviews=raw_reviews_str
    )
    
    display_payload = json.loads(display_response_str)
    print("\n✅ FINAL UI PAYLOAD FOR FRONTEND:")
    print(json.dumps(display_payload, indent=2))

if __name__ == "__main__":
    run_live_pipeline()