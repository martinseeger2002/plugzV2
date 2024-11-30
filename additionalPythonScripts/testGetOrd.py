from getOrdContent import process_tx

def test_process_tx():
    # Sample transaction ID for testing
    sample_txid = "87dcfe3323a77e5cdfaafccbaf247100e40aa644bfaee40e9716f358aef9689bi0"

    print("Starting transaction processing test...")

    # Call the process_tx function
    try:
        result = process_tx(sample_txid, depth=500)
    except Exception as e:
        print(f"An error occurred during processing: {e}")
        return

    # Print the result
    if result == "Processing":
        print("Transaction is currently being processed.")
    elif result is None:
        print("Transaction could not be processed.")
    else:
        print("Transaction processed successfully:")
        print(f"MIME Type: {result['mime_type']}")
        print(f"Base64 Data: {result['base64_data']}")

if __name__ == "__main__":
    test_process_tx()
