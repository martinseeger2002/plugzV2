import { manageWalletsUI } from './manageWalletsUI.js';
import { landingPageUI } from './landingPageUI.js';
import { viewUtxoUI } from './viewUtxoUI.js';
import { sendTxUI } from './sendTxUI.js';
import { sendOrdUI } from './sendOrdUI.js'; // Import sendOrdUI

export function walletUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Apply styles to the landing page
    landingPage.className = 'wallet-landing-page'; // Use a class for styling

    const title = document.createElement('h1');
    title.textContent = 'Wallet';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    const walletDropdown = document.createElement('select');
    walletDropdown.className = 'styled-select'; // Use a class for styling
    const wallets = JSON.parse(localStorage.getItem('wallets')) || [];

    console.log('Loaded wallets:', wallets); // Debug: Log loaded wallets

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select a Wallet';
    defaultOption.disabled = true;
    walletDropdown.appendChild(defaultOption);

    wallets.forEach((wallet) => {
        const option = document.createElement('option');
        option.value = wallet.label;
        option.textContent = wallet.label;
        walletDropdown.appendChild(option);
    });

    const balanceDisplay = document.createElement('div');
    balanceDisplay.className = 'balance-display'; // Use a class for styling
    const addressDisplay = document.createElement('div');
    addressDisplay.className = 'address-display'; // Use a class for styling
    const qrCodeDisplay = document.createElement('img');
    qrCodeDisplay.className = 'qr-code-display'; // Use a class for styling
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy Address';
    copyButton.className = 'styled-button'; // Use a class for styling

    const viewUtxosButton = document.createElement('button');
    viewUtxosButton.textContent = 'View UTXOs';
    viewUtxosButton.className = 'styled-button'; // Use a class for styling
    viewUtxosButton.addEventListener('click', () => viewUtxoUI(walletDropdown.value));

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.className = 'styled-button'; // Use a class for styling
    sendButton.disabled = true; // Disable by default
    sendButton.addEventListener('click', () => sendTxUI(walletDropdown.value));

    const sendOrdButton = document.createElement('button');
    sendOrdButton.textContent = 'Send Ord';
    sendOrdButton.className = 'styled-button'; // Use a class for styling
    sendOrdButton.disabled = true; // Disable by default
    sendOrdButton.addEventListener('click', () => sendOrdUI(walletDropdown.value)); // Navigate to sendOrdUI

    const manageWalletsButton = document.createElement('button');
    manageWalletsButton.textContent = 'Manage Wallets';
    manageWalletsButton.className = 'styled-button'; // Use a class for styling
    manageWalletsButton.addEventListener('click', manageWalletsUI);

    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (selectedWallet) {
            balanceDisplay.textContent = `Balance: ${selectedWallet.balance || 'N/A'}`;
            addressDisplay.textContent = selectedWallet.address; // Display only the address
            qrCodeDisplay.src = `https://api.qrserver.com/v1/create-qr-code/?data=${selectedWallet.address}&size=150x150`;
            sendButton.disabled = false; // Enable send button
            sendOrdButton.disabled = false; // Enable send ord button

            // Save the selected wallet label to local storage
            localStorage.setItem('selectedWalletLabel', selectedWallet.label);
        } else {
            sendButton.disabled = true; // Disable send button if no wallet is selected
            sendOrdButton.disabled = true; // Disable send ord button if no wallet is selected
            localStorage.removeItem('selectedWalletLabel');
        }
    });

    // Ensure the selected wallet is highlighted on initialization
    if (selectedWalletLabel) {
        console.log('Setting selected wallet:', selectedWalletLabel); // Debug: Log selected wallet
        walletDropdown.value = selectedWalletLabel;
        walletDropdown.dispatchEvent(new Event('change')); // Trigger the change event to update UI
    } else if (wallets.length > 0) {
        console.log('No selected wallet, defaulting to first wallet'); // Debug: Log default selection
        walletDropdown.value = wallets[0].label; // Default to the first wallet if none is selected
        walletDropdown.dispatchEvent(new Event('change'));
    }

    copyButton.addEventListener('click', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (selectedWallet) {
            navigator.clipboard.writeText(selectedWallet.address)
                .then(() => alert('Address copied to clipboard!'))
                .catch(err => console.error('Error copying address:', err));
        }
    });

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', landingPageUI);

    // Append elements to the landing page
    landingPage.appendChild(walletDropdown);
    landingPage.appendChild(balanceDisplay);
    landingPage.appendChild(addressDisplay);
    landingPage.appendChild(qrCodeDisplay);
    landingPage.appendChild(copyButton);
    landingPage.appendChild(viewUtxosButton);
    landingPage.appendChild(sendButton);
    landingPage.appendChild(sendOrdButton); // Append the new Send Ord button
    landingPage.appendChild(manageWalletsButton);
    landingPage.appendChild(backButton);

    // Invoke syncAllWallets on page load
    syncAllWallets();

    // Set up periodic syncing every 2 minutes
    setInterval(syncAllWallets, 120000); // 120,000 milliseconds = 2 minutes

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
        if (selectedWalletLabel) {
            const selectedWallet = wallets.find(wallet => wallet.label === selectedWalletLabel);
            if (selectedWallet) {
                balanceDisplay.textContent = `Balance: ${selectedWallet.balance || 'N/A'} | Incoming: ${selectedWallet.incoming || 'N/A'}`;
                // Optionally, update other UI elements if needed
            }
        }
    }
}
