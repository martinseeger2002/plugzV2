# routes/minting.py
from flask import Blueprint, jsonify, request, current_app
from utils.decorators import require_api_key
from utils.rpc_utils import get_rpc_connection
import subprocess
import json
import logging

minting_bp = Blueprint('minting', __name__)

@minting_bp.route('/api/v1/mint_rc001/<ticker>', methods=['POST'])
@require_api_key
def mint_rc001(ticker):
    data = request.json

    # Extract parameters
    receiving_address = data.get('receiving_address')
    meme_type = data.get('meme_type')
    hex_data = data.get('hex_data')
    sending_address = data.get('sending_address')
    privkey = data.get('privkey')
    utxo = data.get('utxo')
    vout = data.get('vout')
    script_hex = data.get('script_hex')
    utxo_amount = data.get('utxo_amount')  # Ensure this is a string
    mint_address = data.get('mint_address')  # Optional parameter
    mint_price_satoshis = data.get('mint_price')  # Already in satoshis

    # Log the extracted parameters for debugging
    print(f"Received mint request with parameters: {data}")

    # Convert 'vout' and 'utxo_amount' to strings for the command
    vout_str = str(vout)
    
    try:
        # Convert utxo_amount to a float, then to satoshis
        utxo_amount_float = float(utxo_amount)
        utxo_amount_satoshis = int(utxo_amount_float * 100000000)
        
        # Log mint price in satoshis
        print(f"Mint Address: {mint_address}, Mint Price (satoshis): {mint_price_satoshis}")
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid amount: {utxo_amount}. Error: {str(e)}"
        }), 400

    # Determine the command directory and script based on the ticker
    if ticker.lower() == 'doge':
        command_dir = './getOrdTxsDoge'
        script = 'getRc001TxDoge.js'
    elif ticker.lower() == 'lky':
        command_dir = './getOrdTxsLKY'
        script = 'getOrdTxsLKY.js'
    elif ticker.lower() == 'ltc':
        command_dir = './getOrdTxsLTC'
        script = 'getOrdTxsLTC.js'
    elif ticker.lower() == 'pepe':
        command_dir = './getOrdTxsPepe'
        script = 'getOrdTxsPepe.js'
    else:
        return jsonify({
            "status": "error",
            "message": "Unsupported ticker type."
        }), 400

    # Define the command to run
    command = [
        'node', script, 'mint',
        receiving_address, meme_type, hex_data,
        sending_address, privkey, utxo, vout_str,
        script_hex, str(utxo_amount_satoshis)
    ]

    # Add mint_address and mint_price to the command if they are provided
    if mint_address and mint_price_satoshis is not None:
        command.extend([mint_address, str(mint_price_satoshis)])

    try:
        # Run the command and capture the output
        result = subprocess.run(
            command,
            cwd=command_dir,
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        error_output = result.stderr.strip()

        # Print both stdout and stderr
        print("Command output:", output)
        print("Command error output:", error_output)

        # Assume output format:
        # Final transaction: <txid>
        # {
        #   "pendingTransactions": [...],
        #   "instructions": "..."
        # }

        # Split the output into the final transaction line and the JSON part
        final_tx_line, json_part = output.split('\n', 1)
        final_tx_id = final_tx_line.replace("Final transaction: ", "").strip()
        json_data = json.loads(json_part)

        # Structure the response as desired
        response = {
            "finalTransaction": final_tx_id,
            "pendingTransactions": json_data.get("pendingTransactions", []),
            "instructions": json_data.get("instructions", "")
        }

        return jsonify(response)

    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": f"Command failed with error: {e.stderr}"
        }), 500
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "Failed to parse command output."
        }), 500
    except json.JSONDecodeError:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON format in command output."
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500

@minting_bp.route('/api/v1/mint/<ticker>', methods=['POST'])
@require_api_key
def mint(ticker):
    data = request.json

    # Extract parameters
    receiving_address = data.get('receiving_address')
    meme_type = data.get('meme_type')
    hex_data = data.get('hex_data')
    sending_address = data.get('sending_address')
    privkey = data.get('privkey')
    utxo = data.get('utxo')
    vout = data.get('vout')
    script_hex = data.get('script_hex')
    utxo_amount = data.get('utxo_amount')  # Ensure this is a string

    # Log the extracted parameters for debugging
    print(f"Received mint request with parameters: {data}")

    # Convert 'vout' and 'utxo_amount' to strings for the command
    vout_str = str(vout)
    
    try:
        # Convert utxo_amount to a float, then to satoshis
        utxo_amount_float = float(utxo_amount)
        utxo_amount_satoshis = int(utxo_amount_float * 100000000)
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid utxo_amount: {utxo_amount}. Error: {str(e)}"
        }), 400

    # Determine the command directory and script based on the ticker
    if ticker.lower() == 'doge':
        command_dir = './getOrdTxsDoge'
        script = 'getOrdTxsDoge.js'
    elif ticker.lower() == 'lky':
        command_dir = './getOrdTxsLKY'
        script = 'getOrdTxsLKY.js'
    elif ticker.lower() == 'ltc':
        command_dir = './getOrdTxsLTC'
        script = 'getOrdTxsLTC.js'
    elif ticker.lower() == 'pepe':
        command_dir = './getOrdTxsPepe'
        script = 'getOrdTxsPepe.js'
    else:
        return jsonify({
            "status": "error",
            "message": "Unsupported ticker type."
        }), 400

    # Define the command to run
    command = [
        'node', script, 'mint',
        receiving_address, meme_type, hex_data,
        sending_address, privkey, utxo, vout_str,
        script_hex, str(utxo_amount_satoshis)
    ]

    try:
        # Run the command and capture the output
        result = subprocess.run(
            command,
            cwd=command_dir,
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        error_output = result.stderr.strip()

        # Print both stdout and stderr
        print("Command output:", output)
        print("Command error output:", error_output)

        # Assume output format:
        # Final transaction: <txid>
        # {
        #   "pendingTransactions": [...],
        #   "instructions": "..."
        # }

        # Split the output into the final transaction line and the JSON part
        final_tx_line, json_part = output.split('\n', 1)
        final_tx_id = final_tx_line.replace("Final transaction: ", "").strip()
        json_data = json.loads(json_part)

        # Structure the response as desired
        response = {
            "finalTransaction": final_tx_id,
            "pendingTransactions": json_data.get("pendingTransactions", []),
            "instructions": json_data.get("instructions", "")
        }

        return jsonify(response)

    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": f"Command failed with error: {e.stderr}"
        }), 500
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "Failed to parse command output."
        }), 500
    except json.JSONDecodeError:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON format in command output."
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500

@minting_bp.route('/api/v1/get_new_address_and_privkey/<ticker>', methods=['GET'])
@require_api_key
def get_new_address_and_privkey(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        new_address = rpc_connection.getnewaddress()
        privkey = rpc_connection.dumpprivkey(new_address)
        return jsonify({
            "status": "success",
            "data": {
                "new_address": new_address,
                "privkey": privkey
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@minting_bp.route('/api/v1/generate_key/<ticker>', methods=['GET'])
@require_api_key
def generate_key(ticker):
    # Determine the command directory and script based on the ticker
    if ticker.lower() == 'doge':
        command_dir = './getOrdTxsDoge'
        script = 'generateKey.js'
    elif ticker.lower() == 'lky':
        command_dir = './getOrdTxsLKY'
        script = 'generateKey.js'
    elif ticker.lower() == 'ltc':
        command_dir = './getOrdTxsLTC'
        script = 'generateKey.js'
    elif ticker.lower() == 'pepe':
        command_dir = './getOrdTxsPepe'
        script = 'generateKey.js'
    else:
        return jsonify({
            "status": "error",
            "message": "Unsupported ticker type."
        }), 400

    # Define the command to run
    command = ['node', script]

    try:
        # Run the command and capture the output
        result = subprocess.run(
            command,
            cwd=command_dir,
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()

        # Assuming the output is in the format:
        # New WIF Private Key: <privkey>
        # Corresponding Address: <address>
        lines = output.split('\n')
        privkey = lines[0].split(': ')[1]
        new_address = lines[1].split(': ')[1]

        # Import the new address without rescan
        rpc_connection = get_rpc_connection(ticker)
        rpc_connection.importaddress(new_address, "", False)  # Use positional arguments

        # Return the output as JSON in the specified format
        return jsonify({
            "status": "success",
            "data": {
                "new_address": new_address,
                "privkey": privkey
            }
        })
    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": f"Command failed with error: {e.stderr}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500

@minting_bp.route('/api/v1/send/<ticker>', methods=['POST'])
@require_api_key
def send(ticker):
    data = request.json

    # Extract parameters
    recipient_address = data.get('recipient_address')
    amount_to_send = data.get('amount_to_send')
    privkey = data.get('privkey')
    fee_utxo_txid = data.get('fee_utxo_txid')
    fee_utxo_vout = data.get('fee_utxo_vout')
    fee_utxo_script = data.get('fee_utxo_script')
    fee_utxo_satoshis = data.get('fee_utxo_satoshis')
    utxos = data.get('utxos', [])  # List of additional UTXOs

    # Log the extracted parameters for debugging
    print(f"Received send request with parameters: {data}")

    # Convert 'amount_to_send' and 'fee_utxo_satoshis' to integers
    try:
        amount_to_send_int = int(amount_to_send)
        fee_utxo_satoshis_int = int(fee_utxo_satoshis)
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid amount: {amount_to_send} or {fee_utxo_satoshis}. Error: {str(e)}"
        }), 400

    # Determine the command directory and script based on the ticker
    if ticker.lower() == 'doge':
        command_dir = './getOrdTxsDoge'
        script = 'getTxsDoge.js'
    elif ticker.lower() == 'lky':
        command_dir = './getOrdTxsLKY'
        script = 'getTxsLKY.js'
    elif ticker.lower() == 'ltc':
        command_dir = './getOrdTxsLTC'
        script = 'getTxsLTC.js'
    elif ticker.lower() == 'pepe':
        command_dir = './getOrdTxsPepe'
        script = 'getTxsPepe.js'
    else:
        return jsonify({
            "status": "error",
            "message": "Unsupported ticker type."
        }), 400

    # Define the command to run
    command = [
        'node', script, 'send',
        recipient_address, str(amount_to_send_int), privkey,
        fee_utxo_txid, str(fee_utxo_vout), fee_utxo_script, str(fee_utxo_satoshis_int)
    ]

    # Add additional UTXOs to the command
    for utxo in utxos:
        command.extend([
            utxo['txid'], str(utxo['vout']), utxo['script'], str(utxo['satoshis'])
        ])

    try:
        # Run the command and capture the output
        result = subprocess.run(
            command,
            cwd=command_dir,
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        error_output = result.stderr.strip()

        # Print both stdout and stderr
        print("Command output:", output)
        print("Command error output:", error_output)

        # Assume output is the transaction hex
        tx_hex = output.strip()

        # Structure the response as desired
        response = {
            "status": "success",
            "transactionHex": tx_hex
        }

        return jsonify(response)

    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": f"Command failed with error: {e.stderr}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500

@minting_bp.route('/api/v1/vault/<ticker>', methods=['POST'])
@require_api_key
def vault(ticker):
    data = request.json

    # Extract parameters
    receiving_address = data.get('receiving_address')
    meme_type = data.get('meme_type')
    hex_data = data.get('hex_data')
    sending_address = data.get('sending_address')
    privkey = data.get('privkey')
    utxo = data.get('utxo')
    vout = data.get('vout')
    script_hex = data.get('script_hex')
    utxo_amount = data.get('utxo_amount')  # Ensure this is a string

    # Log the extracted parameters for debugging
    print(f"Received vault request with parameters: {data}")

    # Convert 'vout' and 'utxo_amount' to strings for the command
    vout_str = str(vout)
    
    try:
        # Convert utxo_amount to a float, then to satoshis
        utxo_amount_float = float(utxo_amount)
        utxo_amount_satoshis = int(utxo_amount_float * 100000000)
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid utxo_amount: {utxo_amount}. Error: {str(e)}"
        }), 400

    # Determine the command directory and script based on the ticker
    if ticker.lower() == 'doge':
        command_dir = './getOrdTxsDoge'
        script = 'getVaultTxsDoge.js'
    elif ticker.lower() == 'lky':
        command_dir = './getOrdTxsLKY'
        script = 'getVaultTxsLKY.js'
    elif ticker.lower() == 'ltc':
        command_dir = './getOrdTxsLTC'
        script = 'getVaultTxsLTC.js'
    elif ticker.lower() == 'pepe':
        command_dir = './getOrdTxsPepe'
        script = 'getVaultTxsPepe.js'
    else:
        return jsonify({
            "status": "error",
            "message": "Unsupported ticker type."
        }), 400

    # Define the command to run
    command = [
        'node', script, 'mint',
        receiving_address, meme_type, hex_data,
        sending_address, privkey, utxo, vout_str,
        script_hex, str(utxo_amount_satoshis)
    ]

    try:
        # Run the command and capture the output
        result = subprocess.run(
            command,
            cwd=command_dir,
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        error_output = result.stderr.strip()

        # Print both stdout and stderr
        print("Command output:", output)
        print("Command error output:", error_output)

        # Assume output format:
        # Final transaction: <txid>
        # {
        #   "pendingTransactions": [...],
        #   "instructions": "..."
        # }

        # Split the output into the final transaction line and the JSON part
        final_tx_line, json_part = output.split('\n', 1)
        final_tx_id = final_tx_line.replace("Final transaction: ", "").strip()
        json_data = json.loads(json_part)

        # Structure the response as desired
        response = {
            "finalTransaction": final_tx_id,
            "pendingTransactions": json_data.get("pendingTransactions", []),
            "instructions": json_data.get("instructions", "")
        }

        return jsonify(response)

    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": f"Command failed with error: {e.stderr}"
        }), 500
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "Failed to parse command output."
        }), 500
    except json.JSONDecodeError:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON format in command output."
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }), 500