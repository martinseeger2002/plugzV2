import sqlite3
import json
import os

def read_all_databases():
    all_tokens = []
    db_directory = './tokens/'

    # List all .db files in the directory
    available_dbs = [os.path.splitext(f)[0] for f in os.listdir(db_directory) if f.endswith('.db')]

    for db_name in available_dbs:
        db_path = os.path.join(db_directory, f'{db_name}.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

        if 'tokens' in tables:
            cursor.execute('SELECT * FROM tokens')
            token_rows = cursor.fetchall()
            token_column_names = [description[0] for description in cursor.description]
            for row in token_rows:
                token = dict(zip(token_column_names, row))
                # Remove 'token_id' from the token dictionary
                token.pop('token_id', None)
                # Calculate mint percentage
                if token['max_supply'] > 0:
                    token['mint_percentage'] = (token['current_supply'] / token['max_supply']) * 100
                else:
                    token['mint_percentage'] = 0
                all_tokens.append(token)

        conn.close()

    with open('all_tokens_data.json', 'w') as json_file:
        json.dump({'tokens': all_tokens}, json_file, indent=4)

if __name__ == "__main__":
    read_all_databases()
