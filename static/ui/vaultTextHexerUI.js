// Import elliptic library for ECC encryption
import { vaultSelectionUI } from './vaultSelectionUI.js';
import { vaultTextUI } from './vaultTextUI.js';
import Elliptic from 'https://cdnjs.cloudflare.com/ajax/libs/elliptic/6.5.4/elliptic.min.js';

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

    // Public Key Input
    const pubkeyInput = document.createElement('input');
    pubkeyInput.type = 'text';
    pubkeyInput.placeholder = 'Enter Public Key (Hex)';
    pubkeyInput.className = 'styled-input';
    landingPage.appendChild(pubkeyInput);

    // Inscribe Button
    const inscribeButton = document.createElement('button');
    inscribeButton.textContent = 'Inscribe';
    inscribeButton.className = 'styled-button';
    inscribeButton.addEventListener('click', () => {
        const textContent = doc.body.textContent;
        const mimeType = mimeTypeDropdown.value;
        const pubkeyHex = pubkeyInput.value.trim();

        if (!textContent) {
            alert('Please enter some text.');
            return;
        }

        if (!pubkeyHex) {
            alert('Please enter a valid public key.');
            return;
        }

        try {
            // Convert text to Base64, then to Hex
            const base64Data = btoa(unescape(encodeURIComponent(textContent)));
            const hexData = base64ToHex(base64Data);

            // Encrypt Hex Data using the provided public key
            const encryptedHexData = encryptHexWithPubKey(hexData, pubkeyHex);

            // Save MIME type and encrypted hex data to local storage
            writeToLocalStorage('pendingHexData', { mimeType, hexData: encryptedHexData });

            // Navigate to vaultTextUI
            vaultTextUI();
        } catch (error) {
            console.error('Encryption error:', error);
            alert('Failed to encrypt the data. Please check the public key format.');
        }
    });
    landingPage.appendChild(inscribeButton);

    // Back Button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        vaultSelectionUI(); // Navigate back to vault selection UI
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

    // Helper function to encrypt Hex data using Dogecoin public key
    function encryptHexWithPubKey(hexData, pubkeyHex) {
        const ec = new Elliptic.ec('secp256k1');
        
        // Generate an ephemeral key pair for ECDH
        const ephemeralKey = ec.genKeyPair();
        const publicKey = ec.keyFromPublic(pubkeyHex, 'hex');

        // Derive shared secret
        const sharedSecret = ephemeralKey.derive(publicKey.getPublic()).toString(16);

        // Convert shared secret to a usable AES key
        const aesKey = CryptoJS.enc.Hex.parse(CryptoJS.SHA256(sharedSecret).toString());

        // Encrypt the hex data with AES-GCM
        const iv = CryptoJS.lib.WordArray.random(12); // IV for AES-GCM
        const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Hex.parse(hexData), aesKey, {
            iv: iv,
            mode: CryptoJS.mode.GCM,
            tagLength: 128 / 8
        });

        // Return encrypted data in hex along with IV and ephemeral public key
        return {
            encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
            iv: iv.toString(CryptoJS.enc.Hex),
            ephemeralPubKey: ephemeralKey.getPublic('hex')  // Send ephemeral public key for decryption
        };
    }

    // Helper function to write to localStorage with logging
    function writeToLocalStorage(key, value) {
        console.log(`Write to localStorage [${key}]:`, value);
        localStorage.setItem(key, JSON.stringify(value));
    }
}
