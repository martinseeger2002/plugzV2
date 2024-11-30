// mintFileUI.js

import { mintSelectionUI } from './mintSelectionUI.js'; // Import the mintSelectionUI function
import { inscribeUI } from './inscribeUI.js'; // Import the inscribeUI function

/**
 * Function to initialize and render the Mint File UI.
 */
export function mintFileUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Mint File';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Display mint credits
    const creditsDisplay = document.createElement('div');
    creditsDisplay.className = 'credits-display'; // Use a class for styling
    landingPage.appendChild(creditsDisplay);

    // Fetch and display mint credits
    fetch('/api/v1/mint_credits')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                creditsDisplay.textContent = `Mint Credits: ${data.credits}`;
            } else {
                creditsDisplay.textContent = 'Error fetching mint credits';
            }
        })
        .catch(error => {
            console.error('Error fetching mint credits:', error);
            creditsDisplay.textContent = 'Error fetching mint credits';
        });

    // Wallet dropdown
    const walletDropdown = document.createElement('select');
    walletDropdown.className = 'styled-select'; // Use a class for styling
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
            option.selected = true; // Select the stored wallet
        }
        walletDropdown.appendChild(option);
    });
    landingPage.appendChild(walletDropdown);

    // UTXO dropdown
    const utxoDropdown = document.createElement('select');
    utxoDropdown.className = 'styled-select'; // Use a class for styling
    landingPage.appendChild(utxoDropdown);

    // Update UTXO dropdown based on selected wallet
    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (selectedWallet && selectedWallet.utxos && selectedWallet.utxos.length > 0) {
            utxoDropdown.innerHTML = ''; // Clear existing options
            selectedWallet.utxos
                .filter(utxo => parseFloat(utxo.value) > 0.01 && utxo.confirmations >= 1) // Filter UTXOs with value > 0.01 and confirmations >= 1
                .forEach(utxo => {
                    const option = document.createElement('option');
                    option.value = `${utxo.txid}:${utxo.vout}`; // Combine txid and vout for uniqueness
                    option.textContent = utxo.value; // Display only the UTXO amount
                    utxoDropdown.appendChild(option);
                });
            if (selectedWallet.utxos.filter(utxo => parseFloat(utxo.value) > 0.01 && utxo.confirmations >= 1).length === 0) {
                utxoDropdown.innerHTML = '<option disabled>No UTXOs available above 0.01 with sufficient confirmations</option>';
            }
        } else {
            utxoDropdown.innerHTML = '<option disabled>No UTXOs available</option>'; // Handle case where no UTXOs are available
        }

        // Save the selected wallet label to local storage
        if (selectedWallet) {
            localStorage.setItem('selectedWalletLabel', selectedWallet.label);
        } else {
            localStorage.removeItem('selectedWalletLabel');
        }
    });

    // **Added Code: Trigger UTXO loading on page load if a wallet is selected**
    if (selectedWalletLabel) {
        walletDropdown.value = selectedWalletLabel;
        walletDropdown.dispatchEvent(new Event('change')); // Trigger the change event to load UTXOs
    }

    // Log selected UTXO information
    utxoDropdown.addEventListener('change', () => {
        if (utxoDropdown.value) {
            const [txid, vout] = utxoDropdown.value.split(':');
            const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
            const selectedUtxo = selectedWallet.utxos.find(utxo => utxo.txid === txid && utxo.vout == vout);
            if (selectedUtxo) {
                console.log('Selected UTXO:', selectedUtxo); // Log the selected UTXO information
            }
        }
    });

    // Receiving address input
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.placeholder = 'Enter receiving address (optional)';
    addressInput.className = 'styled-input'; // Use a class for styling
    landingPage.appendChild(addressInput);

    // File selection container
    const fileContainer = document.createElement('div');
    fileContainer.className = 'file-container'; // Use a class for styling

    // File selection input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-input';
    fileInput.style.display = 'none'; // Hide the default file input

    // File selection label
    const fileLabel = document.createElement('div');
    fileLabel.className = 'file-label styled-button'; // Add styled-button class for styling

    // SVG Icon for the file label
    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgIcon.setAttribute('width', '24');
    svgIcon.setAttribute('height', '24');
    svgIcon.setAttribute('fill', '#00bfff');
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.innerHTML = `
        <path d="M12 2L12 14M12 14L8 10M12 14L16 10M4 18H20" stroke="#00bfff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;

    // File label text
    const fileText = document.createElement('span');
    fileText.textContent = 'Choose File';
    fileText.className = 'file-text'; // Use a class for styling

    // Append SVG and text to the file label
    fileLabel.appendChild(svgIcon);
    fileLabel.appendChild(fileText);

    // Make the entire container clickable to trigger file input
    fileContainer.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', handleFileSelect);

    // Append file input and label to the container
    fileContainer.appendChild(fileInput);
    fileContainer.appendChild(fileLabel);

    // Append the container to the landing page
    landingPage.appendChild(fileContainer);

    // Generate Transactions button
    const generateTxButton = document.createElement('button');
    generateTxButton.textContent = 'Next';
    generateTxButton.className = 'styled-button'; // Use a class for styling
    generateTxButton.addEventListener('click', generateTransactions);
    landingPage.appendChild(generateTxButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        mintSelectionUI(); // Navigate back to mint selection UI
    });
    landingPage.appendChild(backButton);

    /**
     * Function to handle file selection
     * @param {Event} event - The file selection event
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && file.size <= 65 * 1024) { // 100 KB limit
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result.split(',')[1];
                const hex = base64ToHex(base64);
                const mimeType = file.type;
                const receivingAddressInput = addressInput.value.trim(); // Get and trim the receiving address
                const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
                let receivingAddress;

                if (!receivingAddressInput) {
                    if (selectedWallet && selectedWallet.address) {
                        receivingAddress = selectedWallet.address; // Use the selected wallet's address
                        console.log('No receiving address entered. Using selected wallet\'s address:', receivingAddress);
                    } else {
                        alert('Please enter a receiving address.');
                        return;
                    }
                } else {
                    receivingAddress = receivingAddressInput;
                }

                // **IMPORTANT:** Storing sensitive data like addresses should be done securely
                localStorage.setItem('fileToMint', JSON.stringify({ mimeType, hex, receivingAddress }));
                console.log('File and address saved to local storage:', { mimeType, hex, receivingAddress });
            };
            reader.readAsDataURL(file);
        } else {
            alert('File must be under 65 KB.');
        }
    }

    /**
     * Utility function to convert base64 to hex
     * @param {string} base64 - The base64 encoded string
     * @returns {string} - The hex representation of the base64 string
     */
    function base64ToHex(base64) {
        const raw = atob(base64);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    /**
     * Function to generate transactions
     */
    function generateTransactions() {
        // Check for pending transactions
        const pendingTransactions = JSON.parse(localStorage.getItem('mintResponse'))?.pendingTransactions || [];
        if (pendingTransactions.length > 0) {
            alert('There are pending transactions. Continuing to inscribe UI.');
            inscribeUI(); // Navigate to inscribe UI
            return; // Exit the function early
        }

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

        console.log('Selected UTXO for Transaction:', selectedUtxo); // Log selected UTXO

        const fileData = JSON.parse(localStorage.getItem('fileToMint'));

        if (!selectedWallet || !selectedUtxo || !fileData) {
            alert('Please ensure all fields are selected and a file is uploaded.');
            return;
        }

        if (!selectedUtxo.script_hex) {
            alert('Script Hex is missing for the selected UTXO.');
            console.error('Missing script_hex:', selectedUtxo);
            return;
        }

        const requestBody = {
            receiving_address: fileData.receivingAddress,
            meme_type: fileData.mimeType,
            hex_data: fileData.hex,
            sending_address: selectedWallet.address,
            privkey: selectedWallet.privkey, // **WARNING:** Ensure this is securely handled
            utxo: selectedUtxo.txid, // Correctly set to the TXID
            vout: selectedUtxo.vout,
            script_hex: selectedUtxo.script_hex,
            utxo_amount: selectedUtxo.value
        };

        console.log('Request Body:', requestBody); // Log the request body

        fetch(`/api/v1/mint/${selectedWallet.ticker}`, { // Use the correct endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // Assume apiKey is globally accessible
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            console.log('Full Response:', response); // Log the full response object
            return response.json();
        })
        .then(data => {
            console.log('Response Data:', JSON.stringify(data, null, 2)); // Log the response data in a readable format

            // **Adjusting the Success Condition**
            if (data.pendingTransactions && Array.isArray(data.pendingTransactions) && data.pendingTransactions.length > 0) {
                console.log('Pending Transactions:', data.pendingTransactions); // Log pending transactions

                // **Save Transaction Hexes to a List**
                try {
                    // Retrieve existing hexes from local storage, or initialize an empty array
                    let existingHexes = JSON.parse(localStorage.getItem('transactionHexes')) || [];

                    // Extract hex data from pendingTransactions
                    const newHexes = data.pendingTransactions.map(tx => tx.hex);

                    // Append new hexes to the existing list
                    existingHexes.push(...newHexes);

                    // Save the updated list back to local storage
                    localStorage.setItem('transactionHexes', JSON.stringify(existingHexes));
                    console.log('Transaction hexes saved successfully:', newHexes);
                } catch (error) {
                    console.error('Error saving transaction hexes to local storage:', error);
                    alert('An error occurred while saving the transaction hexes.');
                }

                // **Optional:** Save the entire response to local storage
                try {
                    const pendingTransactions = data.pendingTransactions.map(tx => ({
                        ...tx,
                        ticker: selectedWallet.ticker // Add the ticker to each transaction
                    }));

                    localStorage.setItem('mintResponse', JSON.stringify({ pendingTransactions }));
                    console.log('Mint response saved successfully.');
                    
                    // Navigate to inscribe UI instead of alert
                    inscribeUI();
                } catch (error) {
                    console.error('Error saving mintResponse to local storage:', error);
                    alert('An error occurred while saving the mint response.');
                }

                // **New Code: Save Used UTXO as Pending UTXO**
                try {
                    // Retrieve existing pending UTXOs from local storage, or initialize an empty array
                    let pendingUTXOs = JSON.parse(localStorage.getItem('pendingUTXOs')) || [];

                    // Define the used UTXO
                    const usedUtxo = {
                        txid: selectedUtxo.txid,
                        vout: selectedUtxo.vout
                    };

                    // Avoid duplicates
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

                localStorage.removeItem('fileToMint'); // Remove file hex from local storage
            } else {
                // Handle cases where pendingTransactions is missing or empty
                console.error('Mint API did not return pendingTransactions or it is empty:', data);
                alert(data.message || 'An error occurred.');
            }
        })
        .catch(error => {
            console.error('Error generating transaction:', error); // Log the full error
            alert('An error occurred while generating the transaction.');
        });
    }
}
