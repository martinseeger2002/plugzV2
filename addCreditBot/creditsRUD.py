import sqlite3
import sys

def search_by_address(address):
    conn = sqlite3.connect('../db/minteruser.db')
    cursor = conn.cursor()

    table_name = 'users'
    query = f"""
    SELECT user, mint_credits FROM {table_name}
    WHERE doge = ? OR ltc = ? OR lky = ?;
    """
    cursor.execute(query, (address, address, address))
    result = cursor.fetchone()
    conn.close()
    return result

def update_credits(address, amount, operation):
    conn = sqlite3.connect('../db/minteruser.db')
    cursor = conn.cursor()

    table_name = 'users'
    query = f"""
    SELECT mint_credits FROM {table_name}
    WHERE doge = ? OR ltc = ? OR lky = ?;
    """
    cursor.execute(query, (address, address, address))
    result = cursor.fetchone()

    if result:
        current_credits = result[0]
        if operation == 'add':
            new_credits = current_credits + amount
        elif operation == 'del':
            new_credits = max(0, current_credits - amount)  # Ensure credits don't go negative

        update_query = f"""
        UPDATE {table_name}
        SET mint_credits = ?
        WHERE doge = ? OR ltc = ? OR lky = ?;
        """
        cursor.execute(update_query, (new_credits, address, address, address))
        conn.commit()
        print(f"Updated credits: {new_credits}")
    else:
        print("No user found with the given address.")

    conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 printDb.py <crypto_address> [add|del <amount>]")
    else:
        address = sys.argv[1]
        if len(sys.argv) == 2:
            result = search_by_address(address)
            if result:
                print(f"User: {result[0]}, Mint Credits: {result[1]}")
            else:
                print("No user found with the given address.")
        elif len(sys.argv) == 4:
            command = sys.argv[2]
            try:
                amount = int(sys.argv[3])
                if command == 'add':
                    update_credits(address, amount, 'add')
                elif command == 'del':
                    update_credits(address, amount, 'del')
                else:
                    print("Invalid command. Use 'add' or 'del'.")
            except ValueError:
                print("Invalid amount. Please enter a numeric value.")
        else:
            print("Invalid command format.")