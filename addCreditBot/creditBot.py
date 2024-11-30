import json
import subprocess
import time
from decimal import Decimal, ROUND_HALF_UP

# Load wallet data from JSON
def load_wallet_data(file_path):
    try:
        with open(file_path, 'r') as json_file:
            return json.load(json_file)
    except (FileNotFoundError, json.JSONDecodeError):
        print("Error loading JSON file.")
        return {}

# Check UTXOs and call creditsRUD.py if credits_paid is null
def check_and_update_credits(file_path):
    wallet_data = load_wallet_data(file_path)

    for ticker, data in wallet_data.items():
        for utxo in data.get('utxos', []):
            if utxo.get('credits_paid') is None:
                sending_address = utxo['sending_address']
                amount = Decimal(utxo['amount']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

                # Determine credits amount based on the wallet type and amount
                if ticker == "DOGE":
                    if 1 <= amount < 10:
                        credits_amount = int(amount) * 10
                    elif amount >= 10:
                        credits_amount = int(amount) * 21
                    else:
                        credits_amount = 0
                elif ticker == "LKY":
                    if Decimal('0.01') <= amount < Decimal('0.1'):
                        credits_amount = (amount / Decimal('0.01')) * 10
                    elif amount >= Decimal('0.1'):
                        credits_amount = (amount / Decimal('0.01')) * 21
                    else:
                        credits_amount = Decimal(0)

                # Debugging output
                time.sleep(0.15)
                print(f"Ticker: {ticker}")
                print(f"Sending address: {sending_address}")
                print(f"Credits amount: {credits_amount}")

                # Prepare the command with "add"
                command = ['python3', 'creditsRUD.py', sending_address, 'add', str(credits_amount)]

                # Print the command for debugging
                print(f"Executing command: {' '.join(command)}")

                # Call creditsRUD.py with the sending address, "add", and calculated credits amount
                try:
                    subprocess.run(command, check=True)
                    # Update the JSON to mark this UTXO as processed
                    utxo['credits_paid'] = float(credits_amount*2)
                    # Save the updated data back to the JSON file immediately
                    with open(file_path, 'w') as json_file:
                        json.dump(wallet_data, json_file, indent=4)
                    # Wait for 0.05 seconds before continuing
                    time.sleep(0.15)
                except subprocess.CalledProcessError as e:
                    print(f"Error calling creditsRUD.py: {e}")

                # Break after processing the first unprocessed UTXO
                break

if __name__ == '__main__':
    check_and_update_credits('../db/creditsWallet.json')