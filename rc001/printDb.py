import sqlite3
import json

def read_database(db_name):
    # Connect to the SQLite database
    db_path = f'./collections/{db_name}.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to select all records from the items table
    cursor.execute('SELECT * FROM items')

    # Fetch all rows from the executed query
    rows = cursor.fetchall()

    # Print the column names
    column_names = [description[0] for description in cursor.description]
    print(f"Columns: {column_names}")

    # Create a list of dictionaries for JSON output
    data = [dict(zip(column_names, row)) for row in rows]

    # Write the data to a JSON file
    with open(f'{db_name}_data.json', 'w') as json_file:
        json.dump({db_name: data}, json_file, indent=4)

    # Close the database connection
    conn.close()

if __name__ == "__main__":
    # Replace 'your_db_name' with the actual name of your database (without the .db extension)
    db_name = "PixelBosu"
    read_database(db_name)
