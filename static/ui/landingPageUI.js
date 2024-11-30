import { walletUI } from './walletUI.js';
import { mintSelectionUI } from './mintSelectionUI.js';
import { vaultSelectionUI } from './vaultSelectionUI.js';
import { userUI } from './userUI.js';
import { addWalletUI } from './addWalletUI.js';
import { buyCreditsUI } from './buyCreditsUI.js'; // Import the buyCreditsUI function
import { mintPadUI } from './mintPadUI.js'; // Import the mintPadUI function

export function landingPageUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Retrieve stored styles and text
    const storedTitleText = localStorage.getItem('titleText') || 'Plugz Wallet';
    const storedTitleColor = localStorage.getItem('titleColor') || '#a0b9e6';

    // Set styles for the landing page
    landingPage.className = 'landing-page'; // Use a class for styling

    const title = document.createElement('h1');
    title.textContent = storedTitleText;
    title.style.color = storedTitleColor; // Use stored color
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Store title text and color when page is unloaded
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('titleText', title.textContent);
        localStorage.setItem('titleColor', title.style.color);
    });

    // Retrieve selected wallet label from local storage
    const selectedWalletLabel = localStorage.getItem('selectedWalletLabel');

    // Create buttons
    const buttons = [
        { 
            text: 'Wallet', 
            onClick: () => {
                const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
                if (wallets.length === 0) {
                    addWalletUI(); // Redirect to addWalletUI if no wallets exist
                } else {
                    walletUI();
                }
            }
        },
        { 
            text: 'Mint Pad', 
            onClick: mintPadUI // Add button for mintPadUI
        },
        { text: 'Mint', onClick: mintSelectionUI },
        { text: 'Vault', onClick: vaultSelectionUI },
        { text: 'User', onClick: userUI },
        { text: 'Buy Mint Credits', onClick: buyCreditsUI } // Updated button to navigate to buyCreditsUI
    ];

    buttons.forEach(({ text, onClick }) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'styled-button'; // Use a class for styling
        button.addEventListener('click', onClick);
        landingPage.appendChild(button);
    });

    // Ensure selectedWalletLabel is defined before using it
    if (selectedWalletLabel) {
        syncAllWallets(selectedWalletLabel);
    } else {
        console.warn('No selected wallet label found.');
    }
}

async function syncAllWallets(selectedWalletLabel) {
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
                    'X-API-Key': apiKey
                }
            });

            const data = await response.json();
            console.log(`UTXO Response for ${wallet.label}:`, data);

            if (data.status === 'success') {
                wallet.utxos = data.data.txs.map(tx => ({
                    txid: tx.txid,
                    value: tx.value,
                    confirmations: tx.confirmations,
                    vout: tx.vout,
                    script_hex: tx.script_hex
                }));
                console.log(`UTXOs updated for ${wallet.label}:`, wallet.utxos);

                wallet.balance = wallet.utxos
                    .filter(utxo => parseFloat(utxo.value) > 0.01)
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
            console.log(`Balance updated for ${selectedWallet.label}: ${selectedWallet.balance || 'N/A'}`);
            // Optionally, update other UI elements if needed
        }
    }
}
