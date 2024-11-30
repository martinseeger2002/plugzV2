import { mintSelectionUI } from './mintSelectionUI.js'; // Adjust the path as necessary

export function inscribeUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Inscribe Transactions';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Mint Credits Display
    const creditsDisplay = document.createElement('p');
    creditsDisplay.className = 'credits-display'; // Use a class for styling
    landingPage.appendChild(creditsDisplay);

    // Pending Transactions Counter
    const pendingTxDisplay = document.createElement('p');
    pendingTxDisplay.className = 'pending-tx-display'; // Use a class for styling
    landingPage.appendChild(pendingTxDisplay);

    // Fetch and update mint credits and pending transactions
    fetch('/api/v1/mint_credits')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                creditsDisplay.textContent = `Mint Credits: ${data.credits}`;
            } else {
                creditsDisplay.textContent = 'Mint credits error log out and log back in';
                inscribeAllButton.disabled = true; // Disable the inscribe button
            }
        })
        .catch(error => {
            console.error('Error fetching mint credits:', error);
            creditsDisplay.textContent = 'Mint credits error log out and log back in';
            inscribeAllButton.disabled = true; // Disable the inscribe button
        });

    // Initialize Pending Transactions Counter
    const mintResponse = JSON.parse(localStorage.getItem('mintResponse')) || {};
    let pendingTransactions = mintResponse.pendingTransactions || [];
    updatePendingTxCounter(pendingTransactions.length);
    pendingTxDisplay.textContent = `Pending Transactions: ${pendingTransactions.length}`;

    // Inscription Name Input
    const inscriptionNameInput = document.createElement('input');
    inscriptionNameInput.type = 'text';
    inscriptionNameInput.placeholder = 'Inscription name';
    inscriptionNameInput.className = 'inscription-name-input'; // Use a class for styling
    landingPage.appendChild(inscriptionNameInput);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container'; // Ensure this class stacks buttons vertically via CSS
    landingPage.appendChild(buttonContainer);

    // Inscribe All button
    const inscribeAllButton = document.createElement('button');
    inscribeAllButton.textContent = 'Inscribe';
    inscribeAllButton.className = 'splash-enter-button'; // Updated to match mainSplashUI styling
    inscribeAllButton.addEventListener('click', () => inscribeAllTransactions());
    buttonContainer.appendChild(inscribeAllButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'splash-enter-button'; // Updated to match mainSplashUI styling
    backButton.addEventListener('click', () => {
        mintSelectionUI(); // Navigate back to mint file UI
    });
    buttonContainer.appendChild(backButton);

    // Function to update the pending transactions counter
    function updatePendingTxCounter(count) {
        pendingTxDisplay.textContent = `Pending Transactions: ${count}`;
    }

    // Function to inscribe a single transaction
    function inscribeTransaction(showAlert = true) {
        const mintCredits = parseInt(creditsDisplay.textContent.split(': ')[1], 10);
        if (mintCredits < 1) {
            alert('Insufficient mint credits.');
            return Promise.reject('Insufficient mint credits.');
        }

        const mintResponse = JSON.parse(localStorage.getItem('mintResponse')) || {};
        pendingTransactions = mintResponse.pendingTransactions || [];
        if (pendingTransactions.length === 0) {
            alert('No pending transactions available.');
            return Promise.reject('No pending transactions available.');
        }

        // Disable buttons and change text
        inscribeAllButton.disabled = true;
        backButton.disabled = true;
        inscribeAllButton.textContent = 'Processing...';

        const topTransaction = pendingTransactions[0];
        const txHex = topTransaction.hex;
        const ticker = topTransaction.ticker; // Use the ticker from the transaction

        return fetch(`/api/v1/send_raw_tx/${ticker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // Ensure the API key is included here
            },
            body: JSON.stringify({ tx_hex: txHex })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const inscriptionName = inscriptionNameInput.value.trim();
                const myInscriptions = JSON.parse(localStorage.getItem('MyInscriptions')) || [];
                const selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || 'Unknown Wallet';

                // Only add to My Inscriptions if the transaction number is 2
                if (topTransaction.transactionNumber === 2) {
                    myInscriptions.push({
                        name: inscriptionName,
                        txid: data.data.txid,
                        sendingaddress: selectedWalletLabel // Add the selected wallet label
                    });
                    localStorage.setItem('MyInscriptions', JSON.stringify(myInscriptions));
                }

                // Remove the transaction from the pending list
                pendingTransactions.shift();
                localStorage.setItem('mintResponse', JSON.stringify({ pendingTransactions }));

                // Update the pending transactions counter
                updatePendingTxCounter(pendingTransactions.length);

                // Call the remove mint credit API
                fetch('/api/v1/remove_mint_credit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(creditResponse => creditResponse.json())
                .then(creditData => {
                    if (creditData.status === 'success') {
                        creditsDisplay.textContent = `Mint Credits: ${creditData.credits}`;
                    } else {
                        console.error('Error removing mint credit:', creditData.message);
                    }
                });

                if (showAlert) {
                    alert(`Transaction sent successfully! TXID: ${data.data.txid}`);
                }
            } else {
                alert(`Error sending transaction: ${data.message}`);
                return Promise.reject(`Error sending transaction: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error sending transaction:', error);
            if (showAlert) {
                alert('An error occurred while sending the transaction.');
            }
            return Promise.reject(error);
        })
        .finally(() => {
            // Re-enable buttons and reset text
            inscribeAllButton.disabled = false;
            backButton.disabled = false;
            inscribeAllButton.textContent = 'Inscribe All';
        });
    }

    // Function to inscribe all transactions
    function inscribeAllTransactions() {
        const mintCredits = parseInt(creditsDisplay.textContent.split(': ')[1], 10);
        if (mintCredits < 0) {
            alert('Insufficient mint credits to start inscribing transactions.');
            return;
        }

        mintResponse.pendingTransactions = pendingTransactions;
        localStorage.setItem('mintResponse', JSON.stringify(mintResponse));

        function processNextTransaction() {
            if (pendingTransactions.length === 0) {
                alert('All transactions processed.');
                syncAllWallets(); // Sync wallets after all transactions are processed
                return;
            }

            inscribeTransaction(false)
                .then(() => {
                    // Ensure the pendingTransactions array is updated after each successful transaction
                    pendingTransactions = JSON.parse(localStorage.getItem('mintResponse')).pendingTransactions || [];
                    setTimeout(() => {
                        processNextTransaction();
                    }, 1000); // Wait 1 second before processing the next transaction
                })
                .catch(error => {
                    console.error('Error processing transactions:', error);
                });
        }

        processNextTransaction();
    }

    // Borrowed from walletUI.js
    async function syncAllWallets() {
        const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
        const apiUrl = 'https://blockchainplugz.com/api/v1';

        for (const wallet of wallets) {
            const { ticker, address } = wallet;

            try {
                // Import the wallet address
                await fetch(`${apiUrl}/import_address/${ticker}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey // Ensure apiKey is defined and accessible
                    },
                    body: JSON.stringify({ address })
                });

                // Fetch UTXOs
                const response = await fetch(`${apiUrl}/get_tx_unspent/${ticker}/${address}`, {
                    headers: {
                        'X-API-Key': apiKey // Ensure apiKey is defined and accessible
                    }
                });

                const data = await response.json();
                console.log(`UTXO Response for ${wallet.label}:`, data); // Log the UTXO response

                if (data.status === 'success') {
                    wallet.utxos = data.data.txs.map(tx => ({
                        txid: tx.txid,
                        value: tx.value,
                        confirmations: tx.confirmations,
                        vout: tx.vout,
                        script_hex: tx.script_hex
                    }));
                    console.log(`UTXOs updated for ${wallet.label}:`, wallet.utxos); // Log the updated UTXOs

                    // Calculate the confirmed balance by summing up the values of UTXOs with 1 or more confirmations and greater than 0.01
                    wallet.balance = wallet.utxos
                        .filter(utxo => utxo.confirmations >= 1 && parseFloat(utxo.value) > 0.01)
                        .reduce((acc, utxo) => acc + parseFloat(utxo.value), 0);

                    // Calculate the incoming balance by summing up the values of UTXOs with 0 confirmations
                    wallet.incoming = wallet.utxos
                        .filter(utxo => utxo.confirmations === 0)
                        .reduce((acc, utxo) => acc + parseFloat(utxo.value), 0);
                } else {
                    console.error(`Error syncing wallet "${wallet.label}": ${data.message}`);
                }
            } catch (error) {
                console.error(`Error fetching UTXOs for wallet "${wallet.label}":`, error);
            }
        }

        // Save updated wallets back to local storage
        localStorage.setItem('wallets', JSON.stringify(wallets));

        // Update UI if the selected wallet was synced
        const selectedWalletLabel = localStorage.getItem('selectedWalletLabel');
        if (selectedWalletLabel) {
            const selectedWallet = wallets.find(wallet => wallet.label === selectedWalletLabel);
            if (selectedWallet) {
                balanceDisplay.textContent = `Balance: ${selectedWallet.balance || 'N/A'} | Incoming: ${selectedWallet.incoming || 'N/A'}`;
                // Optionally, update other UI elements if needed
            }
        }
    }
}
