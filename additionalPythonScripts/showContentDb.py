import sqlite3

def view_database(db_path):
    try:
        # Connect to the SQLite database using a context manager
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Assuming the table name is 'transactions' and it has 'txid' and 'processing' columns
            cursor.execute("SELECT genesis_txid, processing FROM transactions;")
            
            # Fetch all rows from the query
            rows = cursor.fetchall()
            
            # Print the header
            print("txid | processing")
            print("-" * 40)
            
            # Print each row
            for row in rows:
                print(" | ".join(str(value) for value in row))

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def update_transaction(db_path, txid, mime_type, base64_data):
    try:
        # Connect to the database
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Update the transaction with the extracted data
            cursor.execute('''
                UPDATE transactions
                SET mime_type = ?, base64_data = ?
                WHERE genesis_txid = ?
            ''', (mime_type, base64_data, txid))

            # Commit the transaction
            conn.commit()

            # Debugging: Print confirmation
            print(f"Updated transaction {txid} with MIME type {mime_type} and data.")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def delete_transaction(db_path, txid):
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Delete the transaction with the specified genesis_txid
            cursor.execute('''
                DELETE FROM transactions
                WHERE genesis_txid = ?
            ''', (txid,))
            conn.commit()
            print(f"Deleted transaction {txid}.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

# Path to your database file
db_path = './db/content.db'

# View the database
view_database(db_path)

# Example usage
txid = '09d884b913038b3e8daebbaf5c52f7cdaab80d7825be25da2cb25cac75911d60'
mime_type = 'image/png'
base64_data = 'iVBORw0KGgoAAAANSUhEUgAA...'
update_transaction(db_path, txid, mime_type, base64_data)
