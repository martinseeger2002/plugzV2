import { loginUser, checkLoginState } from '../api/loginUser.js';
import { landingPageUI } from './landingPageUI.js';

export function loginUI() {
    if (checkLoginState()) {
        landingPageUI(); // Redirect to the landing page if already logged in
        return;
    }

    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    const title = document.createElement('h1');
    title.textContent = 'Login';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Create login form
    const form = document.createElement('form');
    form.className = 'login-form'; // Use a class for styling

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = 'Username';
    usernameInput.required = true;
    usernameInput.className = 'styled-input'; // Use a class for styling

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password';
    passwordInput.required = true;
    passwordInput.className = 'styled-input'; // Use a class for styling

    // Create container for login button and checkbox
    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-container'; // Use a class for styling

    const loginButton = document.createElement('button');
    loginButton.type = 'button';
    loginButton.textContent = 'Log In';
    loginButton.className = 'styled-button'; // Use a class for styling
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const keepMeLoggedIn = document.getElementById('keepMeLoggedIn').checked;

        if (username && password) {
            loginUser(username, password, keepMeLoggedIn)
                .then((success) => {
                    if (success) {
                        // Redirect to landingPageUI on successful login
                        landingPageUI();
                    } else {
                        alert('Login failed. Please try again.');
                    }
                })
                .catch(() => {
                });
        } else {
            alert('Please enter both username and password.');
        }
    });

    // Add a toggle button for "Keep me logged in"
    const keepMeLoggedInContainer = document.createElement('div');
    keepMeLoggedInContainer.className = 'keep-logged-in-container'; // Use a class for styling

    const keepMeLoggedInCheckbox = document.createElement('input');
    keepMeLoggedInCheckbox.type = 'checkbox';
    keepMeLoggedInCheckbox.id = 'keepMeLoggedIn';

    const keepMeLoggedInLabel = document.createElement('label');
    keepMeLoggedInLabel.htmlFor = 'keepMeLoggedIn';
    keepMeLoggedInLabel.innerText = 'Keep me logged in';

    keepMeLoggedInContainer.appendChild(keepMeLoggedInCheckbox);
    keepMeLoggedInContainer.appendChild(keepMeLoggedInLabel);

    actionContainer.appendChild(loginButton);
    actionContainer.appendChild(keepMeLoggedInContainer);

    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    form.appendChild(actionContainer);
    landingPage.appendChild(form);

    // **New Code: Create New Account Link**
    const createAccountLink = document.createElement('a');
    createAccountLink.href = '#';
    createAccountLink.textContent = 'Create New Account';
    createAccountLink.className = 'create-account-link'; // Use a class for styling
    createAccountLink.addEventListener('click', createAccountUI);
    landingPage.appendChild(createAccountLink);
}

function createAccountUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    const title = document.createElement('h1');
    title.textContent = 'Create User';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    const form = document.createElement('form');
    form.className = 'create-user-form'; // Use a class for styling

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = 'New Username';
    usernameInput.required = true;
    usernameInput.className = 'styled-input'; // Use a class for styling

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password';
    passwordInput.required = true;
    passwordInput.className = 'styled-input'; // Use a class for styling

    const reenterPasswordInput = document.createElement('input');
    reenterPasswordInput.type = 'password';
    reenterPasswordInput.placeholder = 'Re-enter Password';
    reenterPasswordInput.required = true;
    reenterPasswordInput.className = 'styled-input'; // Use a class for styling

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = 'Submit';
    submitButton.className = 'styled-button'; // Use a class for styling
    submitButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const reenteredPassword = reenterPasswordInput.value.trim();

        if (username && password && password === reenteredPassword) {
            // Call API to create user
            createUser(username, password);
        } else {
            alert('Please ensure all fields are filled and passwords match.');
        }
    });

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', loginUI);

    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    form.appendChild(reenterPasswordInput);
    form.appendChild(submitButton);
    form.appendChild(backButton);

    landingPage.appendChild(form);
}

function createUser(username, password) {
    const apiUrl = '/api/v1/user/create';
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey // Ensure you have the API key available
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('User created successfully. Please log in.');
            loginUI(); // Redirect to login UI
        } else {
            alert(`Error: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error creating user:', error);
        alert('An error occurred while creating the user.');
    });
}
