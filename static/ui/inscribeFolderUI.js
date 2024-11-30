// inscribeFolder.js
import { mintFolderUI } from './mintFolderUI.js'; // Import the mintFolderUI function

/**
 * Function to initialize and render the Inscribe Folder UI.
 */
export function inscribeFolderUI() {
    let continueProcessing = true; // Flag to control processing

    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Inscribe Folder';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Mint Credits Display
    const creditsDisplay = document.createElement('p');
    creditsDisplay.className = 'credits-display'; // Use a class for styling
    landingPage.appendChild(creditsDisplay);

    // Timer Display
    const timerDisplay = document.createElement('p');
    timerDisplay.className = 'timer-display'; // Use a class for styling
    landingPage.appendChild(timerDisplay);

    // JSON Display Iframe
    const jsonIframe = document.createElement('iframe');
    jsonIframe.style.width = '100%';
    jsonIframe.style.height = '300px';
    jsonIframe.style.border = '1px solid #000';
    landingPage.appendChild(jsonIframe);

    // Start/Continue Button
    const startContinueButton = document.createElement('button');
    startContinueButton.textContent = 'Start/Continue';
    startContinueButton.className = 'styled-button'; // Use a class for styling
    startContinueButton.addEventListener('click', () => {
        continueProcessing = true; // Reset the flag when starting
        processEntries();
    });
    landingPage.appendChild(startContinueButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        continueProcessing = false; // Stop processing when back is pressed
        mintFolderUI(); // Navigate back to Mint Folder UI
    });
    landingPage.appendChild(backButton);

    // Fetch and update mint credits
    let mintCredits = 0;
    fetch('/api/v1/mint_credits')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                mintCredits = data.credits;
                creditsDisplay.textContent = `Mint Credits: ${mintCredits}`;
            } else {
                creditsDisplay.textContent = 'Mint credits error. Log out and log back in.';
                startContinueButton.disabled = true; // Disable the button if there's an error
            }
        })
        .catch(error => {
            console.error('Error fetching mint credits:', error);
            creditsDisplay.textContent = 'Mint credits error. Log out and log back in.';
            startContinueButton.disabled = true; // Disable the button if there's an error
        });

    // Function to process JSON entries
    async function processEntries() {
        // Disable the start/continue button at the start of processing
        startContinueButton.disabled = true;

        const folderFileData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const selectedWalletLabel = localStorage.getItem('selectedWalletLabel');
        const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
        const selectedWallet = wallets.find(wallet => wallet.label === selectedWalletLabel);

        if (!selectedWallet) {
            alert('Please select a wallet in the Mint Folder UI.');
            startContinueButton.disabled = false; // Re-enable the button if there's an error
            return;
        }

        for (let entry of folderFileData) {
            if (!continueProcessing) {
                startContinueButton.disabled = false; // Re-enable the button if processing is stopped
                return;
            }

            if (!entry.inscription_id) {
                // Update the iframe with the current entry
                updateIframe(entry);

                if (entry.txid) {
                    // Process pending transactions if txid exists
                    await processPendingTransactions(entry, selectedWallet);
                } else {
                    // Create and send transactions if no txid
                    await createAndSendTransactions(entry, selectedWallet);
                }

                // Save the updated folderFileData to localStorage
                localStorage.setItem('folderFileData', JSON.stringify(folderFileData));

                // Wait for a short period before processing the next entry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await processRemainingTransactions();

        // Re-enable the start/continue button after processing is complete
        startContinueButton.disabled = false;
    }

    // Function to update the iframe with the current JSON entry
    function updateIframe(entry) {
        const doc = jsonIframe.contentDocument || jsonIframe.contentWindow.document;
        doc.open();
        doc.write('<html><body><pre>' + JSON.stringify(entry, null, 2) + '</pre></body></html>');
        doc.close();
    }

    // Function to process pending transactions
    async function processPendingTransactions(entry, selectedWallet) {
        if (!continueProcessing) return; // Check the flag before processing

        let pendingTransactions = entry.pending_transactions || [];
        const maxRetries = 10; // Set a maximum number of retries
        let retryCount = 0;

        // Check if last_txid is confirmed before processing
        if (entry.last_txid) {
            let isConfirmed = false;
            while (!isConfirmed && retryCount < maxRetries) {
                isConfirmed = await checkTransactionConfirmation(entry.last_txid, selectedWallet.ticker);
                if (!isConfirmed) {
                    console.log(`Transaction ${entry.last_txid} not confirmed yet. Retrying in 30 seconds.`);
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
                }
            }

            if (!isConfirmed) {
                console.log(`Transaction ${entry.last_txid} not confirmed after ${maxRetries} retries.`);
                return;
            }
        }

        // Broadcast only the first 25 pending transactions
        const transactionsToBroadcast = pendingTransactions.slice(0, 25);

        for (let currentTransaction of transactionsToBroadcast) {
            if (mintCredits < 1) {
                alert('Insufficient mint credits.');
                return;
            }

            const txHex = currentTransaction.hex;
            let attempts = 0;
            let success = false;

            while (attempts < 3 && !success) {
                try {
                    const response = await fetch(`/api/v1/send_raw_tx/${selectedWallet.ticker}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey
                        },
                        body: JSON.stringify({ tx_hex: txHex })
                    });

                    if (response.status === 500) {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 10)); // Wait 0.01 seconds
                        continue;
                    }

                    const data = await response.json();

                    if (data.status === 'success') {
                        success = true;
                        // Remove the sent transaction from the pending list
                        pendingTransactions.shift();

                        // Update the txid if it's the second transaction
                        if (currentTransaction.number === 2) {
                            entry.txid = data.data.txid;
                        }

                        // Add last_txid to the entry
                        entry.last_txid = data.data.txid;

                        // Update mint credits
                        mintCredits -= 1;
                        creditsDisplay.textContent = `Mint Credits: ${mintCredits}`;

                        // Call the API to remove a mint credit
                        await fetch('/api/v1/remove_mint_credit', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        // Update the entry and iframe
                        entry.pending_transactions = pendingTransactions;
                        updateIframe(entry);

                        // If all transactions are sent, append i0 to txid and set inscription_id
                        if (pendingTransactions.length === 0) {
                            entry.inscription_id = `${entry.txid}i0`;
                            delete entry.last_txid; // Remove last_txid
                            updateIframe(entry);

                            // Sync wallet to update UTXOs
                            await syncWallet(selectedWallet);
                        }
                    } else {
                        // Handle error 26: mempool too long
                        if (data.message && data.message.includes('error code 26')) {
                            console.log('Mempool too long error. Waiting for confirmation.');
                            await waitForConfirmation(entry.txid, selectedWallet.ticker);
                        } else {
                            alert(`Error sending transaction: ${data.message}`);
                            throw new Error(data.message);
                        }
                    }
                } catch (error) {
                    console.error('Error sending transaction:', error);
                    throw error;
                }
            }

            if (!success) {
                return;
            }
        }

        // Save the updated folderFileData to localStorage
        const folderFileData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const entryIndex = folderFileData.findIndex(e => e.file_path === entry.file_path);
        if (entryIndex !== -1) {
            folderFileData[entryIndex] = entry;
            localStorage.setItem('folderFileData', JSON.stringify(folderFileData));
        }
    }

    // After processing all entries, loop through them again to process remaining transactions
    async function processRemainingTransactions() {
        if (!continueProcessing) return; // Check the flag before processing remaining transactions

        const folderFileData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const selectedWalletLabel = localStorage.getItem('selectedWalletLabel');
        const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
        const selectedWallet = wallets.find(wallet => wallet.label === selectedWalletLabel);

        if (!selectedWallet) {
            alert('Please select a wallet in the Mint Folder UI.');
            return;
        }

        let allProcessed = false;

        while (!allProcessed) {
            allProcessed = true;

            for (let entry of folderFileData) {
                if (!entry.inscription_id && entry.pending_transactions && entry.pending_transactions.length > 0) {
                    allProcessed = false;
                    await processPendingTransactions(entry, selectedWallet);
                }
            }
        }

        processEntries()
    }

    // Function to sync wallet and update UTXOs
    async function syncWallet(selectedWallet) {
        const apiUrl = 'https://blockchainplugz.com/api/v1'; // Ensure the correct base URL is used

        try {
            // Import the wallet address
            await fetch(`${apiUrl}/import_address/${selectedWallet.ticker}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey // Ensure apiKey is defined and accessible
                },
                body: JSON.stringify({ address: selectedWallet.address })
            });

            // Fetch UTXOs
            const response = await fetch(`${apiUrl}/get_tx_unspent/${selectedWallet.ticker}/${selectedWallet.address}`, {
                headers: {
                    'X-API-Key': apiKey // Ensure apiKey is defined and accessible
                }
            });

            const data = await response.json();
            console.log(`UTXO Response for ${selectedWallet.label}:`, data); // Log the UTXO response

            if (data.status === 'success') {
                selectedWallet.utxos = data.data.txs.map(tx => ({
                    txid: tx.txid,
                    value: tx.value,
                    confirmations: tx.confirmations,
                    vout: tx.vout,
                    script_hex: tx.script_hex
                }));
                console.log(`UTXOs updated for ${selectedWallet.label}:`, selectedWallet.utxos); // Log the updated UTXOs

                // Update the wallet's UTXOs in local storage
                const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
                const walletIndex = wallets.findIndex(wallet => wallet.label === selectedWallet.label);
                if (walletIndex !== -1) {
                    wallets[walletIndex].utxos = selectedWallet.utxos;
                    localStorage.setItem('wallets', JSON.stringify(wallets));
                    console.log('Wallet UTXOs updated successfully.');
                }
            } else {
                console.error(`Error syncing wallet "${selectedWallet.label}": ${data.message}`);
            }
        } catch (error) {
            console.error(`Error fetching UTXOs for wallet "${selectedWallet.label}":`, error);
        }
    }

    // Function to wait for transaction confirmation
    async function waitForConfirmation(txid, ticker) {
        let confirmed = false;
        while (!confirmed) {
            try {
                const response = await fetch(`/api/v1/get_tx/${ticker}/${txid}`, {
                    headers: {
                        'X-API-Key': apiKey
                    }
                });
                const data = await response.json();

                if (data.status === 'success' && data.data.confirmations > 0) {
                    confirmed = true;
                    console.log(`Transaction ${txid} confirmed.`);
                } else {
                    console.log(`Transaction ${txid} not yet confirmed. Retrying in 30 seconds.`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            } catch (error) {
                console.error('Error checking transaction confirmation:', error);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
    }

    // Function to create and send transactions
    async function createAndSendTransactions(entry, selectedWallet) {
        if (entry.inscription_id) return; // Skip if the entry already has an inscription_id

        if (!continueProcessing) return; // Check the flag before creating transactions

        let utxoFound = false;
        let startOver = false;

        while (!utxoFound) {
            // Sync wallet to refresh UTXOs at the start of each iteration
            await syncWallet(selectedWallet);

            // Ensure entry.last_txid is an array
            const lastTxIds = Array.isArray(entry.last_txid) ? entry.last_txid : [];

            // Find a new UTXO for each entry, ensuring it's not in any last_txid
            const utxoIndex = selectedWallet.utxos.findIndex(utxo => 
                parseFloat(utxo.value) > 5 && 
                utxo.confirmations >= 1 && 
                !lastTxIds.some(txid => txid === utxo.txid)
            );

            if (utxoIndex === -1) {
                // If no suitable UTXO is found, wait 30 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 30000));
                continue;
            }

            // Select and remove the UTXO from the list
            const utxo = selectedWallet.utxos.splice(utxoIndex, 1)[0];
            utxoFound = true; // Exit the loop

            // Convert file data to base64 and then to hex
            const fileData = await getFileData(entry.file_path);
            const base64Data = btoa(fileData);
            const hexData = base64ToHex(base64Data);
            entry.hex_data = hexData;
            updateIframe(entry);

            // Prepare the request body for minting
            const requestBody = {
                receiving_address: selectedWallet.address,
                meme_type: entry.mime_type,
                hex_data: hexData,
                sending_address: selectedWallet.address,
                privkey: selectedWallet.privkey,
                utxo: utxo.txid,
                vout: utxo.vout,
                script_hex: utxo.script_hex,
                utxo_amount: utxo.value
            };

            let attempts = 0;
            let success = false;

            while (attempts < 3 && !success) {
                try {
                    const response = await fetch(`/api/v1/mint/${selectedWallet.ticker}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (response.status === 500) {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 10)); // Wait 0.01 seconds
                        continue;
                    }

                    const data = await response.json();

                    if (data.pendingTransactions && Array.isArray(data.pendingTransactions) && data.pendingTransactions.length > 0) {
                        success = true;
                        // Number the pending transactions and remove hex_data
                        entry.pending_transactions = data.pendingTransactions.map((tx, index) => ({
                            hex: tx.hex,
                            number: index + 1
                        }));
                        delete entry.hex_data;
                        updateIframe(entry);

                        // Start sending pending transactions
                        await processPendingTransactions(entry, selectedWallet);
                    } else {
                        alert('Error minting file: ' + (data.message || 'Unknown error.'));
                        throw new Error(data.message || 'Unknown error.');
                    }
                } catch (error) {
                    console.error('Error minting file:', error);
                    throw error;
                }
            }

            if (!success) {
                return;
            }
        }

        if (startOver) {
            // Restart processing from the first JSON entry
            const folderFileData = JSON.parse(localStorage.getItem('folderFileData')) || [];
            for (let entry of folderFileData) {
                if (!entry.inscription_id && entry.pending_transactions && entry.pending_transactions.length > 0) {
                    await processPendingTransactions(entry, selectedWallet);
                }
            }
        }
    }

    // Utility function to read file data
    function getFileData(filePath) {
        return new Promise((resolve, reject) => {
            let folderInput = document.getElementById('folder-input');

            // If folderInput is not found, create it
            if (!folderInput) {
                folderInput = document.createElement('input');
                folderInput.type = 'file';
                folderInput.webkitdirectory = true; // Allow directory selection
                folderInput.style.display = 'none'; // Hide the default file input
                folderInput.id = 'folder-input'; // Assign an ID
                document.body.appendChild(folderInput); // Append to the body

                // Add an event listener to handle folder selection
                folderInput.addEventListener('change', () => {
                    // Store the selected files in localStorage
                    const files = Array.from(folderInput.files);
                    const folderFileData = files.map(file => ({
                        file_path: file.webkitRelativePath,
                        mime_type: file.type
                    }));
                    localStorage.setItem('folderFileData', JSON.stringify(folderFileData));

                    // Start processing entries after folder selection
                    processEntries();

                    // Retry getting the file data after folder selection
                    getFileData(filePath).then(resolve).catch(reject);
                });
            }

            const files = Array.from(folderInput.files);

            if (files.length === 0) {
                alert('Please reselect the folder.');
                folderInput.click(); // Trigger the folder selection
                reject('Folder not selected.');
                return;
            }

            const file = files.find(f => f.webkitRelativePath === filePath);

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.onerror = function(e) {
                    reject(e);
                };
                reader.readAsBinaryString(file);
            } else {
                reject('File not found: ' + filePath);
            }
        });
    }

    // Utility function to convert base64 to hex
    function base64ToHex(base64) {
        const raw = atob(base64);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    // Function to check if a transaction is confirmed
    async function checkTransactionConfirmation(txid, ticker) {
        try {
            const response = await fetch(`/api/v1/get_tx/${ticker}/${txid}`, {
                headers: {
                    'X-API-Key': apiKey
                }
            });
            const data = await response.json();

            return data.status === 'success' && data.data.confirmations > 0;
        } catch (error) {
            console.error('Error checking transaction confirmation:', error);
            return false;
        }
    }
}