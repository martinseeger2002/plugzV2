# utils/helpers.py
import re
from flask import jsonify, make_response
import base64
import logging
import sqlite3

def fetch_and_replace_content(content, processed_txids):
    """Recursively fetch and replace embedded /content/<txid>i0 links."""
    pattern = re.compile(r'/content/([a-fA-F0-9]+)i0')
    matches = pattern.findall(content)

    for match in matches:
        embedded_txid = match
        if embedded_txid not in processed_txids:
            processed_txids.add(embedded_txid)
            # Fetch embedded content here. You can implement your logic.
            # For now, just log the placeholder.
            logging.info(f"Fetching embedded content for txid: {embedded_txid}")
            embedded_content = ''  # Replace with actual content fetching
            content = content.replace(f'/content/{embedded_txid}i0', embedded_content)

    return content
