import sqlite3

def view_database(db_path):
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT genesis_txid, processing FROM transactions;")
            rows = cursor.fetchall()
            print("txid | processing")
            print("-" * 40)
            for row in rows:
                print(" | ".join(str(value) for value in row))
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def create_transaction(db_path, txid, mime_type, base64_data):
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO transactions (genesis_txid, mime_type, base64_data)
                VALUES (?, ?, ?)
            ''', (txid, mime_type, base64_data))
            conn.commit()
            print(f"Created transaction {txid}.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def update_transaction(db_path, txid, mime_type, base64_data):
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE transactions
                SET mime_type = ?, base64_data = ?
                WHERE genesis_txid = ?
            ''', (mime_type, base64_data, txid))
            conn.commit()
            print(f"Updated transaction {txid} with MIME type {mime_type} and data.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def delete_transaction(db_path, txid):
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM transactions
                WHERE genesis_txid = ?
            ''', (txid,))
            conn.commit()
            print(f"Deleted transaction {txid}.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")

def main():
    db_path = './db/content.db'
    while True:
        print("\nChoose an option:")
        print("1. View transactions")
        print("2. Create a transaction")
        print("3. Update a transaction")
        print("4. Delete a transaction")
        print("5. Exit")
        choice = input("Enter choice: ")

        if choice == '1':
            view_database(db_path)
        elif choice == '2':
            txid = input("Enter txid: ")
            mime_type = input("Enter MIME type: ")
            base64_data = input("Enter base64 data: ")
            create_transaction(db_path, txid, mime_type, base64_data)
        elif choice == '3':
            txid = input("Enter txid to update: ")
            mime_type = input("Enter new MIME type: ")
            base64_data = input("Enter new base64 data: ")
            update_transaction(db_path, txid, mime_type, base64_data)
        elif choice == '4':
            txid = input("Enter txid to delete: ")
            delete_transaction(db_path, txid)
        elif choice == '5':
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()