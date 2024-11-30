import { mintPadUI } from './mintPadUI.js';
import { inscribeUI } from './inscribeUI.js';

export function mintPadBulkUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Mint Pad Bulk';
    title.className = 'page-title';
    landingPage.appendChild(title);

    // Display the collection name
    const pendingCollectionDetails = JSON.parse(localStorage.getItem('pendingCollectionDetails'));
    const collectionName = pendingCollectionDetails.collection_name || 'Unknown Collection';
    const collectionNameDisplay = document.createElement('h2');
    collectionNameDisplay.textContent = `Collection: ${collectionName}`;
    collectionNameDisplay.className = 'collection-name';
    landingPage.appendChild(collectionNameDisplay);

    // Wallet dropdown
    const walletDropdown = document.createElement('select');
    walletDropdown.className = 'styled-select';
    const wallets = JSON.parse(localStorage.getItem('wallets')) || [];

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select a Wallet';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    walletDropdown.appendChild(defaultOption);

    wallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.label;
        option.textContent = wallet.label;
        if (wallet.label === selectedWalletLabel) {
            option.selected = true;
        }
        walletDropdown.appendChild(option);
    });
    landingPage.appendChild(walletDropdown);

    // Number of mints selector
    const numMintsDropdown = document.createElement('select');
    numMintsDropdown.className = 'styled-select';
    landingPage.appendChild(numMintsDropdown);

    // Update UTXO dropdown based on selected wallet
    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        const pendingCollectionDetails = JSON.parse(localStorage.getItem('pendingCollectionDetails'));
        const mintPriceInCoins = parseFloat(pendingCollectionDetails.mint_price) / 100000000; // Convert satoshis to whole coins
        const minUtxoValue = mintPriceInCoins + 0.30; // Add 0.30 to the mint price

        if (selectedWallet && selectedWallet.utxos && selectedWallet.utxos.length > 0) {
            const filteredUtxos = selectedWallet.utxos
                .filter(utxo => parseFloat(utxo.value) >= minUtxoValue && utxo.confirmations >= 1);

            numMintsDropdown.innerHTML = ''; // Clear existing options
            for (let i = 1; i <= filteredUtxos.length; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                numMintsDropdown.appendChild(option);
            }

            if (filteredUtxos.length === 0) {
                numMintsDropdown.innerHTML = '<option disabled>No UTXOs available above the required amount with sufficient confirmations</option>';
            }
        } else {
            numMintsDropdown.innerHTML = '<option disabled>No UTXOs available</option>';
        }

        if (selectedWallet) {
            localStorage.setItem('selectedWalletLabel', selectedWallet.label);
        } else {
            localStorage.removeItem('selectedWalletLabel');
        }
    });

    if (selectedWalletLabel) {
        walletDropdown.value = selectedWalletLabel;
        walletDropdown.dispatchEvent(new Event('change'));
    }

    // Inscribe button
    const inscribeButton = document.createElement('button');
    inscribeButton.textContent = 'Inscribe';
    inscribeButton.className = 'styled-button';
    inscribeButton.addEventListener('click', generateBulkTransactions);
    landingPage.appendChild(inscribeButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        mintPadUI();
    });
    landingPage.appendChild(backButton);

    function generateBulkTransactions() {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (!selectedWallet) {
            alert('Please select a wallet.');
            return;
        }

        const numMints = parseInt(numMintsDropdown.value, 10);
        const pendingCollectionDetails = JSON.parse(localStorage.getItem('pendingCollectionDetails'));
        const mintPriceInCoins = parseFloat(pendingCollectionDetails.mint_price) / 100000000;
        const minUtxoValue = mintPriceInCoins + 0.30;

        const selectedUtxos = selectedWallet.utxos
            .filter(utxo => parseFloat(utxo.value) >= minUtxoValue && utxo.confirmations >= 1)
            .slice(0, numMints);

        if (selectedUtxos.length === 0) {
            alert('Please select a UTXO.');
            return;
        }

        const mintAddress = pendingCollectionDetails.mint_address;
        const collectionName = pendingCollectionDetails.collection_name;

        if (!collectionName) {
            alert('Collection name is not set. Please try again.');
            return;
        }

        const pendingTransactions = [];
        inscribeButton.textContent = 'Processing'; // Update button text

        const transactionPromises = selectedUtxos.map(utxo => {
            return retryTransaction(utxo, selectedWallet, mintAddress, collectionName, pendingCollectionDetails, 5);
        });

        Promise.all(transactionPromises).then(() => {
            if (pendingTransactions.length > 0) {
                console.log('Pending Transactions:', pendingTransactions); // Log pending transactions
                localStorage.setItem('mintResponse', JSON.stringify({ pendingTransactions }));
                inscribeUI();
            } else {
                console.error('No pending transactions were created.');
            }
            inscribeButton.textContent = 'Inscribe'; // Reset button text
        }).catch(error => {
            console.error('Error in processing transactions:', error);
            inscribeButton.textContent = 'Inscribe'; // Reset button text
        });

        function retryTransaction(utxo, selectedWallet, mintAddress, collectionName, pendingCollectionDetails, retries) {
            return new Promise((resolve, reject) => {
                const attemptTransaction = (attempt) => {
                    fetch(`/api/v1/rc001/mint_hex/${collectionName}`)
                        .then(response => response.json())
                        .then(mintData => {
                            if (mintData.status === "success") {
                                const hexString = mintData.hex;

                                const requestBody = {
                                    receiving_address: selectedWallet.address,
                                    meme_type: 'text/html',
                                    hex_data: hexString,
                                    sending_address: selectedWallet.address,
                                    privkey: selectedWallet.privkey,
                                    utxo: utxo.txid,
                                    vout: utxo.vout,
                                    script_hex: utxo.script_hex,
                                    utxo_amount: utxo.value,
                                    mint_address: mintAddress,
                                    mint_price: pendingCollectionDetails.mint_price
                                };

                                return fetch(`/api/v1/mint_rc001/${selectedWallet.ticker}`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-API-Key': apiKey
                                    },
                                    body: JSON.stringify(requestBody)
                                });
                            } else {
                                throw new Error('Error generating mint hex: ' + mintData.message);
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.pendingTransactions) {
                                pendingTransactions.push(...data.pendingTransactions.map(tx => ({
                                    ...tx,
                                    ticker: selectedWallet.ticker
                                })));
                                resolve();
                            } else {
                                alert(data.message || 'An error occurred.');
                                reject(new Error('No pending transactions returned.'));
                            }
                        })
                        .catch(error => {
                            console.error(`Error generating transaction (attempt ${attempt}):`, error);
                            if (attempt < retries) {
                                setTimeout(() => attemptTransaction(attempt + 1), 100); // Retry after 0.1 second
                            } else {
                                reject(error);
                            }
                        });
                };

                attemptTransaction(1);
            });
        }
    }
}