import time
import sqlite3
import json
import os
import aiohttp
import asyncio

API_URL = "https://dogeturbo.ordinalswallet.com"

async def update_collection(api_secret, creator_address, creator_signature, slug, inscriptions):
    url = f"{API_URL}/collection/update"
    payload = {
        "api_secret": api_secret,
        "creator_address": creator_address,
        "creator_signature": creator_signature,
        "inscriptions": inscriptions,
        "slug": slug
    }

    # Write the full payload to a file for inspection, excluding 'inscriptions' from the print
    with open('payload_debug.json', 'w') as debug_file:
        json.dump(payload, debug_file, indent=4)

    # Print the payload for debugging, excluding 'inscriptions'
    print("Payload being sent to API (excluding 'inscriptions'):")
    payload_copy = payload.copy()
    payload_copy.pop('inscriptions', None)
    print(json.dumps(payload_copy, indent=4))

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            if response.status == 200:
                print("Collection updated successfully.")
            else:
                print(f"Failed to update collection: {response.status}")
                error_text = await response.text()
                print(f"Error response: {error_text}")

def read_database(db_name):
    # Connect to the SQLite database
    db_path = f'../collections/{db_name}.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to select all records from the items table
    cursor.execute('SELECT * FROM items')

    # Fetch all rows from the executed query
    rows = cursor.fetchall()

    # Print the column names
    column_names = [description[0] for description in cursor.description]
    print(f"Columns: {column_names}")

    # Load the snList.json file
    with open('./snList.json', 'r') as sn_file:
        sn_list = json.load(sn_file)

    # Create a dictionary for quick lookup
    sn_dict = {item['sn']: item['attributes'] for item in sn_list}

    # Load the layerIndex.json file
    with open('./layerIndex.json', 'r') as layer_file:
        layer_list = json.load(layer_file)

    # Create a dictionary for layer index lookup
    layer_dict = {int(k): v for d in layer_list for k, v in d.items()}

    # Load the traitIndex.json file
    with open('./traitIndex.json', 'r') as trait_file:
        trait_list = json.load(trait_file)

    # Create a dictionary for trait index lookup
    trait_dict = {}
    for trait in trait_list:
        index, value = trait['traitIndex'].split(':')
        if index not in trait_dict:
            trait_dict[index] = {}
        trait_dict[index][value] = trait['name']

    # Create a list of dictionaries for JSON output
    data = []
    for row in rows:
        item = dict(zip(column_names, row))
        sn = item['sn']
        attributes = sn_dict.get(sn, "")

        # Create attributes list from the attributes string
        attributes_list = [
            {
                "trait_type": layer_dict.get(i // 2, f"attribute index {i // 2}"),
                "value": trait_dict.get(str(i // 2), {}).get(attributes[i:i+2], attributes[i:i+2])
            }
            for i in range(0, len(attributes), 2)
        ]

        formatted_item = {
            "id": item['inscription_id'],
            "meta": {
                "name": f"PixelBosu #{item['item_no']}",
                "attributes": attributes_list
            }
        }
        data.append(formatted_item)

    # Write the data to a JSON file
    with open(f'{db_name}_data.json', 'w') as json_file:
        json.dump(data, json_file, indent=4)

    # Load API credentials
    with open('apiCreds.json', 'r') as creds_file:
        creds = json.load(creds_file)

    # Update the collection on Ordinals Wallet
    api_secret = creds['api_secret']
    creator_address = creds['creator_address']
    creator_signature = creds['creator_signature']
    slug = creds['slug']
    asyncio.run(update_collection(api_secret, creator_address, creator_signature, slug, data))

    # Close the database connection
    conn.close()

def get_last_modified_time(db_path):
    return os.path.getmtime(db_path)

def main():
    db_name = "PixelBosu"
    db_path = f'../collections/{db_name}.db'
    last_modified_time = get_last_modified_time(db_path)

    while True:
        try:
            current_modified_time = get_last_modified_time(db_path)
            if current_modified_time != last_modified_time:
                print("Database has changed, updating JSON and collection...")
                read_database(db_name)
                last_modified_time = current_modified_time
            time.sleep(10)  # Check every 10 seconds
        except Exception as e:
            print(f"An error occurred: {e}")
            time.sleep(10)  # Wait before retrying

if __name__ == "__main__":
    main()
