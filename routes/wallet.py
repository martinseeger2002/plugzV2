# routes/wallet.py
from flask import Blueprint, render_template, session, request, jsonify
from utils.decorators import login_required
from db.db_utils import get_db_connection
import bcrypt
from config.config import API_KEY
from flask import current_app
import bcrypt

wallet_bp = Blueprint('wallet', __name__)

ininMintCredits = 50

@wallet_bp.route('/wallet')
def wallet():
    return render_template('minter_index.html', api_key=API_KEY)

@wallet_bp.route('/login', methods=['POST'])
def login():
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password').encode('utf-8')

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE user = ?', (username,)).fetchone()
        conn.close()

        if user and bcrypt.checkpw(password, user['password']):
            session['user'] = username
            return jsonify({"status": "success", "message": "Logged in successfully"}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid username or password"}), 401

    return jsonify({"status": "error", "message": "Invalid request format"}), 400

@wallet_bp.route('/api/v1/mint_credits', methods=['GET'])
def get_mint_credits():
    if 'user' in session:
        username = session['user']
        conn = get_db_connection()
        user = conn.execute('SELECT mint_credits FROM users WHERE user = ?', (username,)).fetchone()
        conn.close()
        if user:
            return jsonify({"status": "success", "credits": user['mint_credits']}), 200
    return jsonify({"status": "error", "message": "User not logged in or credits not found"}), 401

@wallet_bp.route('/api/v1/remove_mint_credit', methods=['POST'])
def remove_mint_credit():
    if 'user' in session:
        username = session['user']
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Fetch the current mint credits
            user = cursor.execute('SELECT mint_credits FROM users WHERE user = ?', (username,)).fetchone()

            if user and user['mint_credits'] > 0:
                # Decrement the mint credits by one
                new_credits = user['mint_credits'] - 1
                cursor.execute('UPDATE users SET mint_credits = ? WHERE user = ?', (new_credits, username))
                conn.commit()
                current_app.logger.info(f"Mint credit removed for user {username}. New credits: {new_credits}")
                return jsonify({"status": "success", "message": "Mint credit removed", "credits": new_credits}), 200
            else:
                current_app.logger.warning(f"Insufficient mint credits for user {username}.")
                return jsonify({"status": "error", "message": "Insufficient mint credits"}), 400

        except Exception as e:
            current_app.logger.error(f"Error removing mint credit for user {username}: {str(e)}")
            return jsonify({"status": "error", "message": "An error occurred while removing mint credit"}), 500

        finally:
            conn.close()

    return jsonify({"status": "error", "message": "User not logged in"}), 401

@wallet_bp.route('/api/v1/wallet/<ticker>', methods=['GET'])
def get_wallet_address(ticker):
    if 'user' in session:
        username = session['user']
        conn = get_db_connection()
        
        # Map the ticker to the corresponding column name in the database
        column_map = {
            'doge': 'doge',
            'ltc': 'ltc',
            'lky': 'lky'
        }
        column_name = column_map.get(ticker.lower())

        if not column_name:
            return jsonify({"status": "error", "message": "Invalid ticker"}), 400

        # Fetch the wallet address for the user by ticker
        user = conn.execute(f'SELECT {column_name} FROM users WHERE user = ?', (username,)).fetchone()
        conn.close()

        if user and user[column_name]:
            return jsonify({"status": "success", "address": user[column_name]}), 200
        else:
            return jsonify({"status": "error", "message": "Address not found"}), 404

    return jsonify({"status": "error", "message": "User not logged in"}), 401

@wallet_bp.route('/api/v1/wallets/<ticker>/<user>', methods=['GET'])
def get_wallet_address_for_user(ticker, user):
    conn = get_db_connection()
    
    # Map the ticker to the corresponding column name in the database
    column_map = {
        'doge': 'doge',
        'ltc': 'ltc',
        'lky': 'lky'
    }
    column_name = column_map.get(ticker.lower())

    if not column_name:
        return jsonify({"status": "error", "message": "Invalid ticker"}), 400

    # Fetch the wallet address for the specified user by ticker
    user_data = conn.execute(f'SELECT {column_name} FROM users WHERE user = ?', (user,)).fetchone()
    conn.close()

    if user_data and user_data[column_name]:
        return jsonify({"status": "success", "address": user_data[column_name]}), 200
    else:
        return jsonify({"status": "error", "message": "Address not found"}), 404

@wallet_bp.route('/api/v1/wallet/<ticker>', methods=['POST'])
def update_wallet_address(ticker):
    if 'user' in session:
        username = session['user']
        data = request.get_json()
        new_address = data.get('address')

        if not new_address:
            return jsonify({"status": "error", "message": "New address not provided"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Map the ticker to the corresponding column name in the database
        column_map = {
            'doge': 'doge',
            'ltc': 'ltc',
            'lky': 'lky'
        }
        column_name = column_map.get(ticker.lower())

        if not column_name:
            return jsonify({"status": "error", "message": "Invalid ticker"}), 400

        try:
            # Update the wallet address for the user by ticker
            cursor.execute(f'UPDATE users SET {column_name} = ? WHERE user = ?', (new_address, username))
            conn.commit()
            current_app.logger.info(f"Wallet address updated for user {username} and ticker {ticker}.")
            return jsonify({"status": "success", "message": "Wallet address updated"}), 200

        except Exception as e:
            current_app.logger.error(f"Error updating wallet address for user {username} and ticker {ticker}: {str(e)}")
            return jsonify({"status": "error", "message": "An error occurred while updating wallet address"}), 500

        finally:
            conn.close()

    return jsonify({"status": "error", "message": "User not logged in"}), 401

@wallet_bp.route('/api/v1/user/update_password', methods=['POST'])
def update_password():
    if 'user' in session:
        username = session['user']
        data = request.get_json()
        new_password = data.get('new_password')

        if not new_password:
            return jsonify({"status": "error", "message": "New password not provided"}), 400

        # Hash the new password using bcrypt
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Update the password for the user
            cursor.execute('UPDATE users SET password = ? WHERE user = ?', (hashed_password, username))
            conn.commit()
            current_app.logger.info(f"Password updated for user {username}.")
            return jsonify({"status": "success", "message": "Password updated successfully"}), 200

        except Exception as e:
            current_app.logger.error(f"Error updating password for user {username}: {str(e)}")
            return jsonify({"status": "error", "message": "An error occurred while updating password"}), 500

        finally:
            conn.close()

    return jsonify({"status": "error", "message": "User not logged in"}), 401

@wallet_bp.route('/api/v1/user/create', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password are required"}), 400

    # Hash the password using bcrypt
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if the username already exists
        existing_user = cursor.execute('SELECT * FROM users WHERE user = ?', (username,)).fetchone()
        if existing_user:
            return jsonify({"status": "error", "message": "Username already exists"}), 409

        # Insert the new user into the database with initial mint credits
        cursor.execute('INSERT INTO users (user, password, mint_credits) VALUES (?, ?, ?)', (username, hashed_password, ininMintCredits))
        conn.commit()
        current_app.logger.info(f"New user created: {username} with 21 mint credits.")
        return jsonify({"status": "success", "message": "User created successfully"}), 201

    except Exception as e:
        current_app.logger.error(f"Error creating user {username}: {str(e)}")
        return jsonify({"status": "error", "message": "An error occurred while creating user"}), 500

    finally:
        conn.close()
