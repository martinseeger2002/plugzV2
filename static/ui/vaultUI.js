export function vaultUI() {
    const vaultPage = document.getElementById('vault-page');
    vaultPage.innerHTML = ''; // Clear existing content

    // Set styles for the vault page
    vaultPage.className = 'vault-page'; // Use a class for styling

    const title = document.createElement('h1');
    title.textContent = 'Vault';
    title.className = 'page-title'; // Use a class for styling
    vaultPage.appendChild(title);

    // Create Address Book button
    const addressBookButton = document.createElement('button');
    addressBookButton.textContent = 'Address Book';
    addressBookButton.className = 'styled-button'; // Use a class for styling
    addressBookButton.addEventListener('click', () => {
        // Currently does nothing
    });
    vaultPage.appendChild(addressBookButton);
}
