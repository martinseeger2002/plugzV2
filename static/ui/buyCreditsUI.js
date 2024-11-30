import { landingPageUI } from './landingPageUI.js';

export function buyCreditsUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Buy Credits';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Ticker Selector
    const tickerSelector = document.createElement('select');
    tickerSelector.className = 'styled-select';
    const tickers = ['DOGE', 'LKY'];
    tickers.forEach(ticker => {
        const option = document.createElement('option');
        option.value = ticker.toLowerCase();
        option.textContent = ticker;
        tickerSelector.appendChild(option);
    });
    landingPage.appendChild(tickerSelector);

    // Set default selection to DOGE
    tickerSelector.value = 'doge';

    // Wallet Info Displays
    const balanceDisplay = document.createElement('div');
    balanceDisplay.className = 'balance-display';
    const addressDisplay = document.createElement('div');
    addressDisplay.className = 'address-display';

    // Display Wallet Information
    landingPage.appendChild(balanceDisplay);
    landingPage.appendChild(addressDisplay);

    // Buy Credit Buttons
    const buy20Button = document.createElement('button');
    buy20Button.className = 'styled-button';

    const buy100Button = document.createElement('button');
    buy100Button.className = 'styled-button';

    const buy420Button = document.createElement('button');
    buy420Button.className = 'styled-button';

    // Update Button Text based on Selected Ticker
    function updateButtonText() {
        const selectedTicker = tickerSelector.value;
        if (selectedTicker === 'doge') {
            buy20Button.innerHTML = '20 Credits<br>1 DOGE';
            buy100Button.innerHTML = '100 Credits<br>5 DOGE';
            buy420Button.innerHTML = '420 Credits<br>10 DOGE';
        } else if (selectedTicker === 'lky') {
            buy20Button.innerHTML = '20 Credits<br>0.01 LKY';
            buy100Button.innerHTML = '100 Credits<br>0.05 LKY';
            buy420Button.innerHTML = '420 Credits<br>0.1 LKY';
        }
    }

    // Initial Button Text Update
    updateButtonText();

    // Define Receiving Addresses and Transaction Fees
    const receivingAddresses = {
        doge: 'DKpHXgYLdi5XiwL9e1D9tXzBSTpTHnBLYA',
        lky: 'L6fDpwqUHYLEjrSEr98rGBz9w9dYHwxjaF'
    };

    const transactionFees = {
        doge: 10000000, // Fee for DOGE
        lky: 2500000    // Fee for LKY
    };

    // Fetch wallet address and corresponding data based on selected ticker
    function fetchWalletData() {
        const selectedTicker = tickerSelector.value;
        const apiUrl = `/api/v1/wallet/${selectedTicker}`;
        console.log(`Fetching ${selectedTicker.toUpperCase()} wallet address from:`, apiUrl);

        fetch(apiUrl, {
            headers: {
                'X-API-Key': apiKey // Ensure you have the API key available
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const address = data.address;
                const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
                const selectedWallet = wallets.find(wallet => wallet.address === address);

                if (selectedWallet) {
                    // Display the wallet's balance and address
                    balanceDisplay.textContent = `Balance: ${selectedWallet.balance || 'N/A'}`;
                    addressDisplay.textContent = `Address: ${selectedWallet.address}`;
                    localStorage.setItem('selectedWalletLabel', selectedWallet.label);
                } else {
                    console.error(`No wallet found with address ${address}`);
                    balanceDisplay.textContent = 'No matching wallet found.';
                    addressDisplay.textContent = '';
                }
            } else {
                console.error(`Error fetching wallet address for ${selectedTicker}:`, data.message);
                alert(`An error occurred while fetching ${selectedTicker.toUpperCase()} address.`);
            }
        })
        .catch(error => {
            console.error(`Error fetching wallet address for ${selectedTicker}:`, error);
            alert(`An error occurred while fetching ${selectedTicker.toUpperCase()} address.`);
        });
    }

    // Fetch Wallet Data on ticker change and initial load
    tickerSelector.addEventListener('change', () => {
        updateButtonText();
        fetchWalletData();
    });
    fetchWalletData(); // Initial load

    // Buy Credits Button Logic
    function handleTransaction(credits, cost) {
        const selectedTicker = tickerSelector.value;
        const receivingAddress = receivingAddresses[selectedTicker];
        const fee = transactionFees[selectedTicker];
        const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
        const selectedWallet = wallets.find(wallet => wallet.address === addressDisplay.textContent.split(': ')[1]);

        if (!selectedWallet || !selectedWallet.utxos || !selectedWallet.privkey) {
            alert('Please add wallet to your vault address in the user UI.');
            return;
        }

        // Filter UTXOs: value > 0.01 and confirmations >= 1
        const filteredUtxos = selectedWallet.utxos.filter(
            utxo => utxo.value > 0.01 && utxo.confirmations >= 1
        );

        if (filteredUtxos.length === 0) {
            alert('No UTXOs available with sufficient value and confirmations.');
            return;
        }

        const amountToSend = selectedTicker === 'doge' ? cost * 100000000 : cost * 1000000;
        const feeUtxo = filteredUtxos[0];
        const otherUtxos = filteredUtxos.slice(1);

        const data = {
            recipient_address: receivingAddress,
            amount_to_send: amountToSend.toString(),
            privkey: selectedWallet.privkey,
            fee_utxo_txid: feeUtxo.txid,
            fee_utxo_vout: feeUtxo.vout,
            fee_utxo_script: feeUtxo.script_hex,
            fee_utxo_satoshis: Math.round(feeUtxo.value * 100000000).toString(),
            utxos: otherUtxos.map(utxo => ({
                txid: utxo.txid,
                vout: utxo.vout,
                script: utxo.script_hex,
                satoshis: Math.round(utxo.value * 100000000).toString()
            }))
        };

        // Fetch transaction hex
        fetch(`/api/v1/send/${selectedWallet.ticker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                const transactionHex = result.transactionHex;
                const confirm = window.confirm(`Transaction Details:\nCredits: ${credits}\nCost: ${cost} ${selectedTicker.toUpperCase()}\nFee: ${fee / 100000000} ${selectedTicker.toUpperCase()}\n\nDo you want to proceed?`);
                if (confirm) {
                    return fetch(`/api/v1/send_raw_tx/${selectedWallet.ticker}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey
                        },
                        body: JSON.stringify({ tx_hex: transactionHex })
                    });
                }
            } else {
                throw new Error(result.message);
            }
        })
        .then(response => response.json())
        .then(sendResult => {
            if (sendResult.status === 'success') {
                alert(`Transaction ID: ${sendResult.txid}`);
            } else {
                alert(sendResult.message);
            }
        })
        .catch(error => {
            console.error('Error sending transaction:', error);
            alert('An error occurred while sending the transaction.');
        });
    }

    // Buy Credits Button Event Listeners
    buy20Button.addEventListener('click', () => handleTransaction(20, tickerSelector.value === 'doge' ? 1 : 0.01));
    buy100Button.addEventListener('click', () => handleTransaction(100, tickerSelector.value === 'doge' ? 5 : 0.05));
    buy420Button.addEventListener('click', () => handleTransaction(420, tickerSelector.value === 'doge' ? 10 : 0.1));

    // Append Buy Credits Buttons
    landingPage.appendChild(buy20Button);
    landingPage.appendChild(buy100Button);
    landingPage.appendChild(buy420Button);

    // Back Button
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.className = 'styled-button';
    backButton.addEventListener('click', landingPageUI);
    landingPage.appendChild(backButton);
}
