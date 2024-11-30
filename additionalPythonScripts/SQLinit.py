import sqlite3

# Connect to the SQLite database (or create it if it doesn't exist)
conn = sqlite3.connect('APIkeys.db')
cursor = conn.cursor()

# Create a table for storing API keys
cursor.execute('''
CREATE TABLE IF NOT EXISTS api_keys (
    user_id TEXT PRIMARY KEY,
    api_key TEXT,
    creation_date TEXT,
    renewal_date TEXT,
    last_login_at INTEGER,
    plan_name TEXT,
    max_daily_requests INTEGER,
    current_period_ends_at INTEGER,
    will_renew_at_period_end BOOLEAN,
    num_requests_today INTEGER,
    num_requests_yesterday INTEGER
)
''')

# Commit the changes and close the connection
conn.commit()
conn.close()