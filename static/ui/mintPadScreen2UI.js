import { mintSelectionUI } from './mintSelectionUI.js';
import { inscribeUI } from './inscribeUI.js';

export function mintPadScreen2UI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Mint rc001';
    title.className = 'page-title';
    landingPage.appendChild(title);

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

    // UTXO dropdown
    const utxoDropdown = document.createElement('select');
    utxoDropdown.className = 'styled-select';
    landingPage.appendChild(utxoDropdown);

    // Update UTXO dropdown based on selected wallet
    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        const pendingCollectionDetails = JSON.parse(localStorage.getItem('pendingCollectionDetails'));
        const mintPriceInCoins = parseFloat(pendingCollectionDetails.mint_price) / 100000000; // Convert satoshis to whole coins
        const minUtxoValue = mintPriceInCoins + 0.30; // Add 0.30 to the mint price

        if (selectedWallet && selectedWallet.utxos && selectedWallet.utxos.length > 0) {
            utxoDropdown.innerHTML = ''; // Clear existing options
            selectedWallet.utxos
                .filter(utxo => parseFloat(utxo.value) >= minUtxoValue && utxo.confirmations >= 1) // Filter UTXOs with value >= minUtxoValue and confirmations >= 1
                .forEach(utxo => {
                    const option = document.createElement('option');
                    option.value = `${utxo.txid}:${utxo.vout}`; // Combine txid and vout for uniqueness
                    option.textContent = utxo.value; // Display only the UTXO amount
                    utxoDropdown.appendChild(option);
                });
            if (selectedWallet.utxos.filter(utxo => parseFloat(utxo.value) >= minUtxoValue && utxo.confirmations >= 1).length === 0) {
                utxoDropdown.innerHTML = '<option disabled>No UTXOs available above the required amount with sufficient confirmations</option>';
            }
        } else {
            utxoDropdown.innerHTML = '<option disabled>No UTXOs available</option>'; // Handle case where no UTXOs are available
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

    // Receiving address input
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.placeholder = 'Enter receiving address (optional)';
    addressInput.className = 'styled-input';
    landingPage.appendChild(addressInput);

    // Generate Transactions button
    const generateTxButton = document.createElement('button');
    generateTxButton.textContent = 'Inscribe';
    generateTxButton.className = 'styled-button';
    generateTxButton.addEventListener('click', generateTransactions);
    landingPage.appendChild(generateTxButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        mintSelectionUI();
    });
    landingPage.appendChild(backButton);

    function generateTransactions() {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (!selectedWallet) {
            alert('Please select a wallet.');
            return;
        }

        if (!utxoDropdown.value) {
            alert('Please select a UTXO.');
            return;
        }

        const [txid, vout] = utxoDropdown.value.split(':');
        const selectedUtxo = selectedWallet.utxos.find(utxo => utxo.txid === txid && utxo.vout == vout);

        console.log('Selected UTXO for Transaction:', selectedUtxo);

        const pendingHexData = JSON.parse(localStorage.getItem('pendingHexData'));
        if (!pendingHexData) {
            alert('No pending hex data found. Please ensure the data is available.');
            return;
        }

        const receivingAddressInput = addressInput.value.trim();
        const receivingAddress = receivingAddressInput || selectedWallet.address;

        // Retrieve mint price and address from local storage
        const pendingCollectionDetails = JSON.parse(localStorage.getItem('pendingCollectionDetails'));
        const mintPrice = parseFloat(pendingCollectionDetails.mint_price);
        const mintAddress = pendingCollectionDetails.mint_address;

        const requestBody = {
            receiving_address: receivingAddress,
            meme_type: pendingHexData.mimeType,
            hex_data: pendingHexData.hexData,
            sending_address: selectedWallet.address,
            privkey: selectedWallet.privkey,
            utxo: selectedUtxo.txid,
            vout: selectedUtxo.vout,
            script_hex: selectedUtxo.script_hex,
            utxo_amount: selectedUtxo.value
        };

        // Conditionally add mint_address and mint_price
        if (mintPrice > 0) {
            requestBody.mint_address = mintAddress;
            requestBody.mint_price = mintPrice;
        }

        console.log('Request Body:', requestBody);

        fetch(`/api/v1/mint_rc001/${selectedWallet.ticker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Response Data:', JSON.stringify(data, null, 2));

            if (data.pendingTransactions && Array.isArray(data.pendingTransactions) && data.pendingTransactions.length > 0) {
                console.log('Pending Transactions:', data.pendingTransactions);

                try {
                    let existingHexes = JSON.parse(localStorage.getItem('transactionHexes')) || [];
                    const newHexes = data.pendingTransactions.map(tx => tx.hex);
                    existingHexes.push(...newHexes);
                    localStorage.setItem('transactionHexes', JSON.stringify(existingHexes));
                    console.log('Transaction hexes saved successfully:', newHexes);
                } catch (error) {
                    console.error('Error saving transaction hexes to local storage:', error);
                    alert('An error occurred while saving the transaction hexes.');
                }

                try {
                    const pendingTransactions = data.pendingTransactions.map(tx => ({
                        ...tx,
                        ticker: selectedWallet.ticker
                    }));

                    localStorage.setItem('mintResponse', JSON.stringify({ pendingTransactions }));
                    console.log('Mint response saved successfully.');
                    
                    inscribeUI();
                } catch (error) {
                    console.error('Error saving mintResponse to local storage:', error);
                    alert('An error occurred while saving the mint response.');
                }

                try {
                    let pendingUTXOs = JSON.parse(localStorage.getItem('pendingUTXOs')) || [];
                    const usedUtxo = {
                        txid: selectedUtxo.txid,
                        vout: selectedUtxo.vout
                    };

                    const isAlreadyPending = pendingUTXOs.some(utxo => utxo.txid === usedUtxo.txid && utxo.vout === usedUtxo.vout);
                    if (!isAlreadyPending) {
                        pendingUTXOs.push(usedUtxo);
                        localStorage.setItem('pendingUTXOs', JSON.stringify(pendingUTXOs));
                        console.log('Pending UTXO saved:', usedUtxo);
                    } else {
                        console.log('UTXO is already marked as pending:', usedUtxo);
                    }
                } catch (error) {
                    console.error('Error saving pending UTXOs to local storage:', error);
                    alert('An error occurred while saving the pending UTXO.');
                }

                localStorage.removeItem('pendingHexData');
            } else {
                console.error('Mint API did not return pendingTransactions or it is empty:', data);
                alert(data.message || 'An error occurred.');
            }
        })
        .catch(error => {
            console.error('Error generating transaction:', error);
            alert('An error occurred while generating the transaction.');
        });
    }
}