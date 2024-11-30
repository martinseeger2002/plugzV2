import { addWalletUI } from './addWalletUI.js';
import { walletUI } from './walletUI.js';


export function manageWalletsUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    const title = document.createElement('h1');
    title.textContent = 'Manage Wallets';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    const wallets = JSON.parse(localStorage.getItem('wallets')) || [];

    const walletDropdown = document.createElement('select');
    walletDropdown.className = 'styled-select'; // Use a class for styling

    wallets.forEach((wallet, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = wallet.label;
        walletDropdown.appendChild(option);
    });

    landingPage.appendChild(walletDropdown);

    const walletOptionsDiv = document.createElement('div');
    walletOptionsDiv.className = 'wallet-options'; // Use a class for styling
    landingPage.appendChild(walletOptionsDiv);

    walletDropdown.addEventListener('change', (event) => {
        const selectedWallet = wallets[event.target.value];
        displayWalletOptions(selectedWallet, walletOptionsDiv, wallets);
    });

    if (wallets.length > 0) {
        displayWalletOptions(wallets[0], walletOptionsDiv, wallets);
    }

    const addWalletButton = document.createElement('button');
    addWalletButton.textContent = 'Add Wallet';
    addWalletButton.className = 'styled-button'; // Use a class for styling
    addWalletButton.addEventListener('click', addWalletUI);
    landingPage.appendChild(addWalletButton);

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', walletUI);
    landingPage.appendChild(backButton);
}

function displayWalletOptions(wallet, container, wallets) {
    container.innerHTML = ''; // Clear previous options

    const walletLabel = document.createElement('div');
    walletLabel.textContent = `${wallet.label} (${wallet.ticker})`; // Add ticker to wallet label
    walletLabel.className = 'wallet-label'; // Use a class for styling
    container.appendChild(walletLabel);

    const renameButton = document.createElement('button');
    renameButton.textContent = 'Rename';
    renameButton.className = 'styled-button'; // Use a class for styling
    renameButton.addEventListener('click', () => renameWallet(wallet, wallets));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'styled-button delete-button'; // Use a class for styling
    deleteButton.addEventListener('click', () => deleteWallet(wallet, wallets));

    const viewPrivateKeyButton = document.createElement('button');
    viewPrivateKeyButton.textContent = 'View Private Key';
    viewPrivateKeyButton.className = 'styled-button'; // Use a class for styling
    viewPrivateKeyButton.addEventListener('click', () => viewPrivateKey(wallet));

    container.appendChild(renameButton);
    container.appendChild(deleteButton);
    container.appendChild(viewPrivateKeyButton);
}

function renameWallet(wallet, wallets) {
    const newLabel = prompt('Enter new label:', wallet.label);
    if (newLabel) {
        wallet.label = newLabel;
        localStorage.setItem('wallets', JSON.stringify(wallets));
        manageWalletsUI(); // Refresh the UI
    }
}

function deleteWallet(wallet, wallets) {
    const confirmDelete = confirm(`Are you sure you want to delete the wallet: ${wallet.label}? Make sure to back up your private keys or they will be lost.`);
    if (confirmDelete) {
        const index = wallets.indexOf(wallet);
        if (index > -1) {
            wallets.splice(index, 1);
            localStorage.setItem('wallets', JSON.stringify(wallets));
            manageWalletsUI(); // Refresh the UI
        }
    }
}

function viewPrivateKey(wallet) {
    const wifPrivkey = wallet.privkey;
    alert(`WIF Private Key: ${wifPrivkey}`);
}
