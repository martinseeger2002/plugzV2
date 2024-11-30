import { walletUI } from './walletUI.js';

export function viewUtxoUI(selectedLabel) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and style the iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'scrollable-iframe'; // Add a class for styling
    iframe.style.width = '300px'; // Set width
    iframe.style.height = '550px'; // Set height to make it shorter
    iframe.style.border = '1px solid #000'; // Add border
    iframe.style.overflow = 'auto'; // Enable scrolling
    landingPage.appendChild(iframe);

    // Retrieve the selected wallet's UTXOs
    const wallets = JSON.parse(localStorage.getItem('wallets')) || [];
    const selectedWallet = wallets.find(wallet => wallet.label === selectedLabel);

    if (selectedWallet && selectedWallet.utxos) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        // Display UTXOs in the iframe
        selectedWallet.utxos.forEach(utxo => {
            const utxoDiv = doc.createElement('div');
            utxoDiv.className = 'utxo-item'; // Use a class for styling
            utxoDiv.textContent = `TXID: ${utxo.txid}, Value: ${utxo.value}, Confirmations: ${utxo.confirmations}`;
            body.appendChild(utxoDiv);
        });
    } else {
        const noUtxosMessage = document.createElement('div');
        noUtxosMessage.textContent = 'No UTXOs available.';
        noUtxosMessage.className = 'no-utxos-message'; // Use a class for styling
        landingPage.appendChild(noUtxosMessage);
    }

    // Back button to return to the wallet UI
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', walletUI);
    landingPage.appendChild(backButton);
}
