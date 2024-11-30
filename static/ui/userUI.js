import { landingPageUI } from './landingPageUI.js';
import { loginUI } from './loginUI.js'; // Import loginUI to redirect after logout

export function userUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Apply styles to the landing page
    landingPage.className = 'user-landing-page'; // Use a class for styling

    const title = document.createElement('h1');
    title.textContent = 'User Interface';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Create form elements
    const form = document.createElement('form');
    const dogeButton = createButton('Dogecoin Vault', 'doge');
    const lkyButton = createButton('Luckycoin Vault', 'lky');

    form.appendChild(dogeButton);
    form.appendChild(lkyButton);

    landingPage.appendChild(form);

    // **New Code: Clear Pending Transactions Button**
    const clearPendingButton = document.createElement('button');
    clearPendingButton.textContent = 'Clear Mint Cache';
    clearPendingButton.className = 'styled-button'; // Use a class for styling
    clearPendingButton.addEventListener('click', () => {
        localStorage.removeItem('selectedWalletLabel'); // Clear selected wallet label
        localStorage.removeItem('pendingHexData'); // Clear pending hex data
        localStorage.removeItem('mintResponse'); // Clear mint response
        localStorage.removeItem('transactionHexes'); // Clear transaction hexes
        localStorage.removeItem('pendingUTXOs'); // Clear pending UTXOs
        localStorage.removeItem('fileToMint'); // Clear file to mint data
        alert('Cache cleared.');
    });
    landingPage.appendChild(clearPendingButton);

    // **New Code: Clear Folder Cache Button**
    const clearFolderCacheButton = document.createElement('button');
    clearFolderCacheButton.textContent = 'Clear Folder Cache';
    clearFolderCacheButton.className = 'styled-button'; // Use a class for styling
    clearFolderCacheButton.addEventListener('click', () => {
        localStorage.removeItem('folderFileData'); // Clear folder file data
        alert('Folder cache cleared.');
    });
    landingPage.appendChild(clearFolderCacheButton);

    // Create Change Password button
    const changePasswordButton = document.createElement('button');
    changePasswordButton.textContent = 'Change Password';
    changePasswordButton.className = 'styled-button change-password-button'; // Use a class for styling
    changePasswordButton.addEventListener('click', handleChangePassword);

    landingPage.appendChild(changePasswordButton);

    // Create Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', landingPageUI);

    landingPage.appendChild(backButton);

    // Create Logout button
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Logout';
    logoutButton.className = 'styled-button logout-button'; // Use a class for styling
    logoutButton.addEventListener('click', handleLogout);

    landingPage.appendChild(logoutButton);

    // Fetch user data and populate fields
    fetchUserData();

    function createButton(buttonText, name) {
        const button = document.createElement('button');
        button.textContent = buttonText;
        button.name = name;
        button.className = 'styled-button'; // Use a class for styling
        button.addEventListener('click', () => handleAddressButtonClick(name));
        return button;
    }

    function handleAddressButtonClick(ticker) {
        // Remove all button elements
        landingPage.innerHTML = '';

        // Create new title
        const newTitle = document.createElement('h1');
        newTitle.textContent = `${ticker.charAt(0).toUpperCase() + ticker.slice(1)} Address`;
        newTitle.className = 'page-title';
        landingPage.appendChild(newTitle);

        // Create text entry box
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = form.querySelector(`button[name="${ticker}"]`).getAttribute('data-address') || '';
        input.className = 'address-input';
        landingPage.appendChild(input);

        // Create submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit';
        submitButton.className = 'styled-button';
        submitButton.addEventListener('click', (event) => {
            event.preventDefault();
            const newAddress = input.value.trim();
            if (newAddress) {
                validateAndUpdateAddress(ticker, newAddress);
            }
        });
        landingPage.appendChild(submitButton);

        // Create back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back';
        backButton.className = 'styled-button back-button';
        backButton.addEventListener('click', userUI); // Reload initial userUI state
        landingPage.appendChild(backButton);
    }

    function handleChangePassword() {
        // Remove all button elements
        landingPage.innerHTML = '';

        // Create new password input interface
        const newPasswordTitle = document.createElement('h2');
        newPasswordTitle.textContent = 'Enter New Password';
        landingPage.appendChild(newPasswordTitle);

        const newPasswordInput = createPasswordInput();
        landingPage.appendChild(newPasswordInput.container);

        const reenterPasswordTitle = document.createElement('h2');
        reenterPasswordTitle.textContent = 'Re-enter New Password';
        landingPage.appendChild(reenterPasswordTitle);

        const reenterPasswordInput = createPasswordInput();
        landingPage.appendChild(reenterPasswordInput.container);

        // Create submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit';
        submitButton.className = 'styled-button';
        submitButton.addEventListener('click', (event) => {
            event.preventDefault();
            const newPassword = newPasswordInput.input.value.trim();
            const reenteredPassword = reenterPasswordInput.input.value.trim();

            if (newPassword && newPassword === reenteredPassword) {
                updatePassword(newPassword);
            } else {
                alert('Passwords do not match. Please try again.');
            }
        });
        landingPage.appendChild(submitButton);

        // Create back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back';
        backButton.className = 'styled-button back-button';
        backButton.addEventListener('click', userUI); // Reload initial userUI state
        landingPage.appendChild(backButton);
    }

    function createPasswordInput() {
        const container = document.createElement('div');
        container.className = 'password-container';

        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'password-input';

        const toggleButton = document.createElement('span');
        toggleButton.textContent = '👁️';
        toggleButton.className = 'toggle-password';
        toggleButton.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        });

        container.appendChild(input);
        container.appendChild(toggleButton);

        return { container, input };
    }

    function updatePassword(newPassword) {
        const apiUrl = '/api/v1/user/update_password';
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // Ensure you have the API key available
            },
            body: JSON.stringify({ new_password: newPassword })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Password updated successfully.');
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error updating password:', error);
            alert('An error occurred while updating the password.');
        });
    }

    function validateAndUpdateAddress(ticker, newAddress) {
        const validationUrl = `/api/v1/is_valid_address/${ticker}/${newAddress}`;
        fetch(validationUrl, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey // Ensure you have the API key available
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data.is_valid) {
                updateWalletAddress(ticker, newAddress);
            } else {
                alert('Invalid address. Please enter a valid address.');
            }
        })
        .catch(error => {
            console.error('Error validating address:', error);
            alert('An error occurred while validating the address.');
        });
    }

    function updateWalletAddress(ticker, newAddress) {
        const apiUrl = `/api/v1/wallet/${ticker}`;
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // Ensure you have the API key available
            },
            body: JSON.stringify({ address: newAddress })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Wallet address updated successfully.');
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error updating wallet address:', error);
            alert('An error occurred while updating the wallet address.');
        });
    }

    function fetchUserData() {
        const tickers = ['doge', 'lky'];
        tickers.forEach(ticker => {
            const apiUrl = `/api/v1/wallet/${ticker}`;
            console.log(`Fetching ${ticker.toUpperCase()} address from:`, apiUrl);

            fetch(apiUrl, {
                headers: {
                    'X-API-Key': apiKey // Ensure you have the API key available
                }
            })
            .then(response => {
                console.log(`Response status for ${ticker}:`, response.status);
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    const button = form.querySelector(`button[name="${ticker}"]`);
                    const address = data.address || '';
                    button.setAttribute('data-address', address); // Store the address in a data attribute
                } else {
                    console.error(`Error fetching ${ticker} address:`, data.message);
                }
            })
            .catch(error => {
                console.error(`Error fetching ${ticker} address:`, error);
                alert(`An error occurred while fetching ${ticker.toUpperCase()} address.`);
            });
        });
    }

    function handleLogout() {
        // Remove login state from localStorage
        localStorage.removeItem('isLoggedIn');
        console.log('User has been logged out.');

        // Redirect to login UI
        loginUI();
    }
}
