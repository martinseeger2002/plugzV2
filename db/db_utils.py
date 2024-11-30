# db/db_utils.py
import sqlite3

def get_db_connection():
    conn = sqlite3.connect('./db/minteruser.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_api_key_db_connection():
    conn = sqlite3.connect('./db/APIkeys.db')
    return conn

def get_content_db_connection():
    conn = sqlite3.connect('./db/content.db')
    return conn
