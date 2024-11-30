# routes/user.py
from flask import Blueprint, jsonify, request
from utils.decorators import require_api_key
import sqlite3

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/v1/account_info', methods=['GET'])
@require_api_key
def get_account_info():
    api_key = request.headers.get('X-API-Key') or request.headers.get('X-Api-Key')

    conn = sqlite3.connect('./db/APIkeys.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT user_id, creation_date, renewal_date, last_login_at, plan_name,
               max_daily_requests, current_period_ends_at, will_renew_at_period_end,
               num_requests_today, num_requests_yesterday
        FROM api_keys
        WHERE api_key = ?
    ''', (api_key,))
    row = cursor.fetchone()
    conn.close()

    if row:
        (user_id, creation_date, renewal_date, last_login_at, plan_name,
         max_daily_requests, current_period_ends_at, will_renew_at_period_end,
         num_requests_today, num_requests_yesterday) = row

        return jsonify({
            "last_login_at": last_login_at,
            "plan": {
                "name": plan_name,
                "max_daily_requests": max_daily_requests,
                "current_period_ends_at": current_period_ends_at,
                "will_renew_at_period_end": bool(will_renew_at_period_end)
            },
            "num_requests_used": {
                "today": num_requests_today,
                "yesterday": num_requests_yesterday
            }
        })
    else:
        return jsonify({"status": "error", "message": "Invalid API key"}), 401
