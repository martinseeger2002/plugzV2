import { vaultSelectionUI } from './vaultSelectionUI.js';

export function vaultTextUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Vault Text';
    title.className = 'page-title';
    landingPage.appendChild(title);

    // Ticker Selector
    const tickerDropdown = document.createElement('select');
    tickerDropdown.className = 'styled-select';
    const tickers = ['DOGE', 'LKY'];
    tickers.forEach(ticker => {
        const option = document.createElement('option');
        option.value = ticker;
        option.textContent = ticker;
        tickerDropdown.appendChild(option);
    });
    landingPage.appendChild(tickerDropdown);

    // Address Book Name Dropdown
    const nameDropdown = document.createElement('select');
    nameDropdown.className = 'styled-select';
    landingPage.appendChild(nameDropdown);

    // Update name dropdown based on selected ticker
    tickerDropdown.addEventListener('change', updateNameDropdown);
    updateNameDropdown(); // Initial population

    function updateNameDropdown() {
        const selectedTicker = tickerDropdown.value;
        const addressBook = JSON.parse(localStorage.getItem('AddressBook')) || [];
        nameDropdown.innerHTML = ''; // Clear existing options

        addressBook.forEach(contact => {
            const hasAddress = selectedTicker === 'DOGE' ? contact.doge !== 'N/A' : contact.lky !== 'N/A';
            if (hasAddress) {
                const option = document.createElement('option');
                option.value = contact.name;
                option.textContent = contact.name;
                nameDropdown.appendChild(option);
            }
        });
    }

    // Get Public Key Button
    const getPubKeyButton = document.createElement('button');
    getPubKeyButton.textContent = 'Get Public Key';
    getPubKeyButton.className = 'styled-button';
    getPubKeyButton.addEventListener('click', () => {
        const selectedName = nameDropdown.value;
        const selectedTicker = tickerDropdown.value;
        const addressBook = JSON.parse(localStorage.getItem('AddressBook')) || [];
        const contact = addressBook.find(c => c.name === selectedName);

        if (!contact) {
            alert('Please select a valid contact.');
            return;
        }

        const publicKey = selectedTicker === 'DOGE' ? contact.dogePublicKey : contact.lkyPublicKey;
        if (!publicKey || publicKey === 'N/A') {
            alert('Selected contact does not have a valid public key for the selected ticker.');
            return;
        }

        publicKeyDisplay.textContent = `Public Key: ${publicKey}`;
    });
    landingPage.appendChild(getPubKeyButton);

    // Public Key Display
    const publicKeyDisplay = document.createElement('div');
    publicKeyDisplay.className = 'public-key-display';
    landingPage.appendChild(publicKeyDisplay);

    // Back Button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        vaultSelectionUI();
    });
    landingPage.appendChild(backButton);
}