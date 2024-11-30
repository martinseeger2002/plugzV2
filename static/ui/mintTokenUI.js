import { mintSelectionUI } from './mintSelectionUI.js';
import { inscribeUI } from './inscribeUI.js';

export function mintTokenUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Mint Token';
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

    // Number of UTXOs to use dropdown
    const numUtxosDropdown = document.createElement('select');
    numUtxosDropdown.className = 'styled-select';
    landingPage.appendChild(numUtxosDropdown);

    // Update UTXO dropdown and token standard based on selected wallet
    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (selectedWallet && selectedWallet.utxos && selectedWallet.utxos.length > 0) {
            utxoDropdown.innerHTML = ''; // Clear existing options
            numUtxosDropdown.innerHTML = ''; // Clear existing options for number of UTXOs

            const filteredUtxos = selectedWallet.utxos
                .filter(utxo => parseFloat(utxo.value) >= 1.2 && utxo.confirmations >= 1);

            filteredUtxos.forEach(utxo => {
                const option = document.createElement('option');
                option.value = `${utxo.txid}:${utxo.vout}`;
                option.textContent = utxo.value;
                utxoDropdown.appendChild(option);
            });

            // Populate number of UTXOs dropdown
            for (let i = 1; i <= filteredUtxos.length; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                numUtxosDropdown.appendChild(option);
            }

            if (filteredUtxos.length === 0) {
                utxoDropdown.innerHTML = '<option disabled>No UTXOs available above 1.2 with sufficient confirmations</option>';
            }
        } else {
            utxoDropdown.innerHTML = '<option disabled>No UTXOs available</option>';
        }

        if (selectedWallet) {
            localStorage.setItem('selectedWalletLabel', selectedWallet.label);

            // Automatically select token standard based on wallet ticker
            if (selectedWallet.ticker === 'drc') {
                tokenStandardDropdown.value = 'drc-20';
            } else if (selectedWallet.ticker === 'lky') {
                tokenStandardDropdown.value = 'lky-20';
            } else if (selectedWallet.ticker === 'prc') {
                tokenStandardDropdown.value = 'prc-20';
            }
        } else {
            localStorage.removeItem('selectedWalletLabel');
        }
    });

    if (selectedWalletLabel) {
        walletDropdown.value = selectedWalletLabel;
        walletDropdown.dispatchEvent(new Event('change'));
    }

    // Token standard selector
    const tokenStandardDropdown = document.createElement('select');
    tokenStandardDropdown.className = 'styled-select';
    ['drc-20', 'lky-20', 'prc-20'].forEach(standard => {
        const option = document.createElement('option');
        option.value = standard;
        option.textContent = standard;
        tokenStandardDropdown.appendChild(option);
    });
    landingPage.appendChild(tokenStandardDropdown);

    // Operation selector
    const operationDropdown = document.createElement('select');
    operationDropdown.className = 'styled-select';
    ['mint', 'deploy', 'transfer'].forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op;
        operationDropdown.appendChild(option);
    });
    landingPage.appendChild(operationDropdown);

    // Tick input
    const tickInput = document.createElement('input');
    tickInput.type = 'text';
    tickInput.placeholder = 'plgz'; // Set default placeholder
    tickInput.className = 'styled-input';
    tickInput.autocapitalize = 'off'; // Disable auto-capitalization
    landingPage.appendChild(tickInput);

    // Amount input (conditionally displayed)
    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.placeholder = '420'; // Set default placeholder
    amountInput.className = 'styled-input';
    amountInput.autocapitalize = 'off'; // Disable auto-capitalization
    landingPage.appendChild(amountInput);

    // Max input (conditionally displayed)
    const maxInput = document.createElement('input');
    maxInput.type = 'text';
    maxInput.placeholder = 'Enter max supply';
    maxInput.className = 'styled-input';
    maxInput.autocapitalize = 'off'; // Disable auto-capitalization
    landingPage.appendChild(maxInput);

    // Limit input (conditionally displayed)
    const limitInput = document.createElement('input');
    limitInput.type = 'text';
    limitInput.placeholder = 'Enter limit';
    limitInput.className = 'styled-input';
    limitInput.autocapitalize = 'off'; // Disable auto-capitalization
    landingPage.appendChild(limitInput);

    // Receiving address input
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.className = 'styled-input'; // Use a class for styling
    landingPage.appendChild(addressInput);

    // Prepopulate ticker, amount, and receiving address from local storage
    const lastMintedTicker = localStorage.getItem('lastMintedTicker');
    const lastMintedAmount = localStorage.getItem('lastMintedAmount');
    const lastReceivingAddress = localStorage.getItem('lastReceivingAddress');

    if (lastMintedTicker) {
        tickInput.value = lastMintedTicker;
    }
    if (lastMintedAmount) {
        amountInput.value = lastMintedAmount;
    }
    if (lastReceivingAddress) {
        addressInput.value = lastReceivingAddress;
    }

    // Set placeholder for receiving address based on selected wallet
    const selectedWallet = wallets.find(wallet => wallet.label === selectedWalletLabel);
    if (selectedWallet && selectedWallet.address) {
        addressInput.placeholder = selectedWallet.address;
    }

    // Show/hide inputs based on operation
    operationDropdown.addEventListener('change', () => {
        const op = operationDropdown.value;
        amountInput.style.display = (op === 'mint' || op === 'transfer') ? 'block' : 'none';
        maxInput.style.display = (op === 'deploy') ? 'block' : 'none';
        limitInput.style.display = (op === 'deploy') ? 'block' : 'none';

        // Only set default values if no stored values exist
        if (op === 'mint' && !lastMintedTicker) {
            tickInput.value = 'plgz'; // Prepopulate ticker
        }
        if (op === 'mint' && !lastMintedAmount) {
            amountInput.value = '420'; // Prepopulate amount
        }
    });
    operationDropdown.dispatchEvent(new Event('change'));

    // Generate Transactions button
    const generateTxButton = document.createElement('button');
    generateTxButton.textContent = 'Inscribe';
    generateTxButton.className = 'styled-button';
    generateTxButton.addEventListener('click', () => {
        // Disable the button to prevent multiple clicks
        generateTxButton.disabled = true;

        // Save the current ticker, amount, and receiving address to local storage
        localStorage.setItem('lastMintedTicker', tickInput.value);
        localStorage.setItem('lastMintedAmount', amountInput.value);
        localStorage.setItem('lastReceivingAddress', addressInput.value);

        const numUtxosToUse = parseInt(numUtxosDropdown.value, 10);
        generateTransactions(numUtxosToUse).finally(() => {
            // Re-enable the button after transactions are processed
            generateTxButton.disabled = false;
        });
    });
    landingPage.appendChild(generateTxButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        mintSelectionUI();
    });
    landingPage.appendChild(backButton);

    async function generateTransactions(numUtxosToUse) {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (!selectedWallet) {
            alert('Please select a wallet.');
            return;
        }

        const selectedUtxos = Array.from(utxoDropdown.options)
            .slice(0, numUtxosToUse)
            .map(option => {
                const [txid, vout] = option.value.split(':');
                return selectedWallet.utxos.find(utxo => utxo.txid === txid && utxo.vout == vout);
            });

        if (selectedUtxos.length === 0) {
            alert('Please select a UTXO.');
            return;
        }

        const pendingTransactions = [];
        const errorMessages = [];

        for (const selectedUtxo of selectedUtxos) {
            try {
                const data = await mintTransaction(selectedWallet, selectedUtxo);
                if (data.pendingTransactions && Array.isArray(data.pendingTransactions) && data.pendingTransactions.length > 0) {
                    pendingTransactions.push(...data.pendingTransactions);
                } else {
                    errorMessages.push(data.message || 'An error occurred.');
                }
            } catch (error) {
                errorMessages.push('An error occurred while generating the transaction.');
            }
        }

        if (pendingTransactions.length > 0) {
            try {
                const existingMintResponse = JSON.parse(localStorage.getItem('mintResponse')) || { pendingTransactions: [] };
                existingMintResponse.pendingTransactions.push(...pendingTransactions.map(tx => ({
                    ...tx,
                    ticker: selectedWallet.ticker
                })));
                localStorage.setItem('mintResponse', JSON.stringify(existingMintResponse));
                console.log('Mint response saved successfully.');
            } catch (error) {
                errorMessages.push('An error occurred while saving the mint response.');
            }
        }

        if (errorMessages.length > 0) {
            alert('Some errors occurred:\n' + errorMessages.join('\n'));
        }

        if (pendingTransactions.length > 0) {
            inscribeUI();
        }
    }

    async function mintTransaction(wallet, utxo) {
        const receivingAddressInput = addressInput.value.trim();
        let receivingAddress = receivingAddressInput || wallet.address;

        const tokenData = {
            p: tokenStandardDropdown.value,
            op: operationDropdown.value,
            tick: tickInput.value
        };

        if (amountInput.style.display === 'block' && amountInput.value) {
            tokenData.amt = amountInput.value;
        }

        if (maxInput.style.display === 'block' && maxInput.value) {
            tokenData.max = maxInput.value;
        }

        if (limitInput.style.display === 'block' && limitInput.value) {
            tokenData.lim = limitInput.value;
        }

        const tokenDataString = JSON.stringify(tokenData);
        const hexData = stringToHex(tokenDataString);

        const requestBody = {
            receiving_address: receivingAddress,
            meme_type: 'text/plain',
            hex_data: hexData,
            sending_address: wallet.address,
            privkey: wallet.privkey,
            utxo: utxo.txid,
            vout: utxo.vout,
            script_hex: utxo.script_hex,
            utxo_amount: utxo.value
        };

        const response = await fetch(`/api/v1/mint/${wallet.ticker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (data.pendingTransactions) {
            try {
                let existingHexes = JSON.parse(localStorage.getItem('transactionHexes')) || [];
                const newHexes = data.pendingTransactions.map(tx => tx.hex);
                existingHexes.push(...newHexes);
                localStorage.setItem('transactionHexes', JSON.stringify(existingHexes));
                console.log('Transaction hexes saved successfully:', newHexes);
            } catch (error) {
                console.error('Error saving transaction hexes to local storage:', error);
                throw new Error('Error saving transaction hexes to local storage.');
            }

            try {
                let pendingUTXOs = JSON.parse(localStorage.getItem('pendingUTXOs')) || [];
                const usedUtxo = {
                    txid: utxo.txid,
                    vout: utxo.vout
                };

                const isAlreadyPending = pendingUTXOs.some(pendingUtxo => pendingUtxo.txid === usedUtxo.txid && pendingUtxo.vout === usedUtxo.vout);
                if (!isAlreadyPending) {
                    pendingUTXOs.push(usedUtxo);
                    localStorage.setItem('pendingUTXOs', JSON.stringify(pendingUTXOs));
                    console.log('Pending UTXO saved:', usedUtxo);
                } else {
                    console.log('UTXO is already marked as pending:', usedUtxo);
                }
            } catch (error) {
                console.error('Error saving pending UTXOs to local storage:', error);
                throw new Error('Error saving pending UTXOs to local storage.');
            }
        }

        return data;
    }

    function stringToHex(str) {
        return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    }
}
