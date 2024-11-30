// static/api/loginUser.js

import { landingPageUI } from '../ui/landingPageUI.js';

export function loginUser(username, password, keepMeLoggedIn) {
    return fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            if (keepMeLoggedIn) {
                localStorage.setItem('isLoggedIn', 'true');
            } else {
                localStorage.removeItem('isLoggedIn');
            }
            return true; // Indicate success
        } else {
            return false; // Indicate failure
        }
    })
    .catch(error => {
        console.error('Error:', error);
        return false; // Indicate failure on error
    });
}

// Check login state on page load
export function checkLoginState() {
    return localStorage.getItem('isLoggedIn') === 'true';
}
