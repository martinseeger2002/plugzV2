import { mintSelectionUI } from './mintSelectionUI.js'; // Import your mintSelectionUI function
import { mintTextUI } from './mintTextUI.js';

export function textHexerUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Text';
    title.className = 'page-title';
    landingPage.appendChild(title);

    // MIME Type Dropdown
    const mimeTypeDropdown = document.createElement('select');
    mimeTypeDropdown.className = 'styled-select';
    const mimeTypes = ['text/plain', 'application/json', 'text/html', 'text/css', 'application/javascript'];
    mimeTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        mimeTypeDropdown.appendChild(option);
    });
    landingPage.appendChild(mimeTypeDropdown);

    // Text Input Iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'scrollable-iframe';
    iframe.style.width = '300px';
    iframe.style.height = '425px';
    iframe.style.border = '1px solid #000';
    iframe.style.overflow = 'auto';
    landingPage.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write('<html><body contenteditable="true" style="background-color: black; color: white; margin: 0; padding: 10px;"></body></html>');
    doc.close();

    // Inscribe Button
    const inscribeButton = document.createElement('button');
    inscribeButton.textContent = 'Inscribe';
    inscribeButton.className = 'styled-button';
    inscribeButton.addEventListener('click', () => {
        const textContent = doc.body.textContent;
        const mimeType = mimeTypeDropdown.value;

        if (textContent) {
            const base64Data = btoa(unescape(encodeURIComponent(textContent)));
            const hexData = base64ToHex(base64Data);

            // Save MIME type and hex data to local storage
            writeToLocalStorage('pendingHexData', { mimeType, hexData });

            // Navigate to mintTextUI
            mintTextUI();
        } else {
            alert('Please enter some text.');
        }
    });
    landingPage.appendChild(inscribeButton);

    // Back Button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        mintSelectionUI(); // Navigate back to mint selection UI
    });
    landingPage.appendChild(backButton);

    // Helper function to convert Base64 to Hex
    function base64ToHex(base64String) {
        const raw = atob(base64String);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    // Helper function to write to localStorage with logging
    function writeToLocalStorage(key, value) {
        console.log(`Write to localStorage [${key}]:`, value);
        localStorage.setItem(key, JSON.stringify(value));
    }
}
