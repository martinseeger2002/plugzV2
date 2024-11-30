import { landingPageUI } from './landingPageUI.js'; // Import the landingPageUI function
import { addressBookUI } from './addressBookUI.js'; // Import the addressBookUI function
import { vaultTextUI } from './vaultTextUI.js'; // Import the vaultTextUI function

export function vaultSelectionUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    const title = document.createElement('h1');
    title.textContent = 'Vault';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Display mint credits
    const creditsDisplay = document.createElement('div');
    creditsDisplay.className = 'credits-display'; // Use a class for styling
    landingPage.appendChild(creditsDisplay);

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

    // Address Book button
    const addressBookButton = document.createElement('button');
    addressBookButton.textContent = 'Address Book';
    addressBookButton.className = 'styled-button'; // Use a class for styling
    addressBookButton.addEventListener('click', () => {
        addressBookUI(); // Navigate back to landing page UI
    });
    landingPage.appendChild(addressBookButton);

    // Send Text Vault button
    const sendTextVaultButton = document.createElement('button');
    sendTextVaultButton.textContent = 'Send Text Vault (Coming Soon)';
    sendTextVaultButton.className = 'styled-button'; // Use a class for styling
    //sendTextVaultButton.addEventListener('click', () => {
    //    vaultTextUI(); // Navigate to vault text UI
    //});
    landingPage.appendChild(sendTextVaultButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        landingPageUI(); // Navigate back to landing page UI
    });
    landingPage.appendChild(backButton);

    // Add more UI elements for vault selection as needed
}