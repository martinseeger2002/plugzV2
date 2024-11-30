# routes/main.py
from flask import Blueprint, render_template, send_file, jsonify, make_response, current_app as app
import re
import sqlite3
import base64
from utils.getOrdContent import process_tx
from db.db_utils import get_content_db_connection


main_bp = Blueprint('main', __name__)



def fetch_and_replace_content(content, processed_txids):
    """ Recursively fetch and replace embedded /content/<txid>i0 links """
    pattern = re.compile(r'/content/([a-fA-F0-9]+)i0')
    matches = pattern.findall(content)

    for match in matches:
        embedded_txid = match
        if embedded_txid not in processed_txids:
            processed_txids.add(embedded_txid)
            embedded_content = display_content(embedded_txid, processed_txids)
            content = content.replace(f'/content/{embedded_txid}i0', embedded_content)

    return content

@main_bp.route('/')
def landing_page():
    return render_template('main.html')

@main_bp.route('/api_tester.html')
def api_tester():
    return render_template('api_tester.html')

@main_bp.route('/rc001parent')
def rc001parent():
    return render_template('rc001parent.html')

@main_bp.route('/rc001')
def rc001():
    return render_template('rc001.html')

@main_bp.route('/content/<txid>i0', methods=['GET'])
def display_content(txid, processed_txids=None):
    if processed_txids is None:
        processed_txids = set()

    try:
        # Remove the 'i0' suffix if present
        if txid.endswith('i0'):
            txid = txid[:-2]

        # Connect to the database using the utility function
        conn = get_content_db_connection()
        cursor = conn.cursor()

        # Query the database for the content
        cursor.execute('SELECT mime_type, base64_data FROM transactions WHERE genesis_txid = ?', (txid,))
        result = cursor.fetchone()

        if not result:
            # If not found, call process_tx to retrieve the data
            app.logger.info(f"Data not found in DB for txid: {txid}. Calling process_tx.")
            result = process_tx(txid, depth=500)

            # If process_tx returns valid data, store it in the database
            if isinstance(result, dict) and 'base64_data' in result:
                mime_type = result.get('mime_type', 'application/octet-stream')
                base64_data = result['base64_data']
                cursor.execute('''
                    INSERT INTO transactions (genesis_txid, mime_type, base64_data, processing)
                    VALUES (?, ?, ?, 0)
                ''', (txid, mime_type, base64_data))
                conn.commit()
            else:
                app.logger.error("Failed to process the transaction.")
                return jsonify({"status": "error", "message": "Failed to process the transaction."}), 500
        else:
            mime_type, base64_data = result

        conn.close()

        decoded_data = base64.b64decode(base64_data)

        # Check if the content is HTML
        if mime_type == 'text/html':
            content = decoded_data.decode('utf-8')

            # Recursively fetch and replace embedded content
            content = fetch_and_replace_content(content, processed_txids)

            return content  # Display the content as a webpage

        # For other MIME types, return the raw content
        response = make_response(decoded_data)
        response.headers['Content-Type'] = mime_type
        return response

    except Exception as e:
        # Log the exception for debugging
        app.logger.error(f"An unexpected error occurred: {str(e)}")
        return jsonify({"status": "complete", "message": f"Data extracted from the blockchain. Refresh the page to view the content."}), 500

@main_bp.route('/terminal')
def terminal():
    return render_template('terminal.html')

