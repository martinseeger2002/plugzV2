# utils/decorators.py
from functools import wraps
from flask import request, jsonify, g, session, redirect
import time
import sqlite3
import logging

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_logged_in' not in session:
            return redirect("https://blockchainplugz.com/wallet")
        return f(*args, **kwargs)
    return decorated_function

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.headers.get('X-Api-Key')
        logging.info(f"Received request for: {request.path}")
        logging.info(f"Received API Key: {api_key}")
        logging.info(f"Headers: {request.headers}")

        # Query the database for the API key
        conn = sqlite3.connect('./db/APIkeys.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT user_id, last_login_at, plan_name, max_daily_requests,
                   num_requests_today, num_requests_yesterday
            FROM api_keys
            WHERE api_key = ?
        ''', (api_key,))
        row = cursor.fetchone()

        if row:
            user_id, last_login_at, plan_name, max_daily_requests, num_requests_today, num_requests_yesterday = row
            logging.info("API key is valid")

            logging.info(f"Max daily requests: {max_daily_requests}")
            logging.info(f"Current requests today: {num_requests_today}")

            if num_requests_today >= max_daily_requests:
                logging.info("API key has exceeded the maximum daily requests")
                conn.close()
                return jsonify({"status": "error", "message": "API key has exceeded the maximum daily requests"}), 403

            # Update the usage statistics
            last_login_at = int(time.time())
            num_requests_today += 1

            cursor.execute('''
                UPDATE api_keys
                SET last_login_at = ?,
                    num_requests_today = ?
                WHERE user_id = ?
            ''', (last_login_at, num_requests_today, user_id))
            conn.commit()
            conn.close()

            # Store user info in 'g' for access in the endpoint if needed
            g.user_info = {
                'user_id': user_id,
                'plan_name': plan_name,
                'max_daily_requests': max_daily_requests,
                'num_requests_today': num_requests_today,
                'num_requests_yesterday': num_requests_yesterday
            }

            return f(*args, **kwargs)
        else:
            conn.close()
            logging.info("Invalid or missing API key")
            return jsonify({"status": "error", "message": "Invalid or missing API key"}), 401
    return decorated_function
