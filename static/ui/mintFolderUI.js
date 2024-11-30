import { mintSelectionUI } from './mintSelectionUI.js'; // Import the mintSelectionUI function
import { fileJsonUI } from './fileJsonUI.js'; // Import the fileJsonUI function
import { inscribeFolderUI } from './inscribeFolderUI.js'; // Import the inscribeFolderUI function

/**
 * Function to initialize and render the Mint Folder UI.
 */
export function mintFolderUI(selectedWalletLabel = localStorage.getItem('selectedWalletLabel') || null) {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Create and append the page title
    const title = document.createElement('h1');
    title.textContent = 'Mint Folder';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

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

    // Update selected wallet in local storage
    walletDropdown.addEventListener('change', () => {
        const selectedWallet = wallets.find(wallet => wallet.label === walletDropdown.value);
        if (selectedWallet) {
            localStorage.setItem('selectedWalletLabel', selectedWallet.label);
        } else {
            localStorage.removeItem('selectedWalletLabel');
        }
    });

    // **Added Code: Trigger wallet selection on page load if a wallet is selected**
    if (selectedWalletLabel) {
        walletDropdown.value = selectedWalletLabel;
        walletDropdown.dispatchEvent(new Event('change')); // Trigger the change event
    }

    // Folder selection input
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.webkitdirectory = true; // Allow directory selection
    folderInput.style.display = 'none'; // Hide the default file input
    folderInput.id = 'folder-input'; // Add this line to assign an ID

    // Folder selection label
    const folderLabel = document.createElement('div');
    folderLabel.className = 'folder-label styled-button'; // Add styled-button class for styling
    folderLabel.textContent = 'Select Folder';

    // Check if folderFileData exists in local storage
    const folderFileData = localStorage.getItem('folderFileData');
    if (folderFileData) {
        folderLabel.classList.add('disabled'); // Add a class to indicate it's disabled
        folderLabel.style.pointerEvents = 'none'; // Disable click events
        folderLabel.style.opacity = '0.5'; // Visually indicate it's disabled
    } else {
        // Make the label clickable to trigger folder input
        folderLabel.addEventListener('click', () => {
            folderInput.click();
        });
    }

    // Handle folder selection
    folderInput.addEventListener('change', handleFolderSelect);

    // Append folder input and label to the landing page
    landingPage.appendChild(folderLabel);
    landingPage.appendChild(folderInput);

    // View JSON button
    const viewJsonButton = document.createElement('button');
    viewJsonButton.textContent = 'View JSON';
    viewJsonButton.className = 'styled-button'; // Use a class for styling
    viewJsonButton.addEventListener('click', () => {
        fileJsonUI(); // Navigate to the File JSON UI
    });
    landingPage.appendChild(viewJsonButton);

    // Inscribe button
    const inscribeButton = document.createElement('button');
    inscribeButton.textContent = 'Inscribe';
    inscribeButton.className = 'styled-button'; // Use a class for styling
    inscribeButton.addEventListener('click', () => {
        inscribeFolderUI(folderInput); // Pass folderInput to inscribeFolderUI
    });
    landingPage.appendChild(inscribeButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        mintSelectionUI(); // Navigate back to mint selection UI
    });
    landingPage.appendChild(backButton);

    // Function to handle folder selection
    function handleFolderSelect(event) {
        const files = Array.from(event.target.files);
        const fileDataArray = [];

        files.forEach(file => {
            if (file.size <= 65 * 1024) { // Check file size limit
                const fileData = {
                    name: file.name.split('.').slice(0, -1).join('.'), // File name without extension
                    file_path: file.webkitRelativePath, // Store the complete file path
                    file_size: file.size,
                    mime_type: file.type,
                    hex_data: '', // Placeholder for future use
                    pending_transaction: '', // Placeholder for future use
                    txid: '', // Placeholder for future use
                    inscription_id: '' // Placeholder for future use
                };
                fileDataArray.push(fileData);
            } else {
                alert(`File ${file.name} must be under 65 KB.`);
            }
        });

        // Log all file paths for debugging
        console.log('Files selected:', files.map(f => f.webkitRelativePath));

        // Sort the file data array numerically based on the number after '#'
        fileDataArray.sort((a, b) => {
            const numA = extractNumber(a.name);
            const numB = extractNumber(b.name);
            return numA - numB;
        });

        // Save the file data array to local storage
        localStorage.setItem('folderFileData', JSON.stringify(fileDataArray));
        console.log('Folder file data saved to local storage:', fileDataArray);
    }

    // Utility function to extract number after '#' in the file name
    function extractNumber(name) {
        const match = name.match(/#(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }
}
