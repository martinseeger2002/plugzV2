import { mintSelectionUI } from './mintSelectionUI.js'; // Adjust the path as necessary
import { fileJsonUI } from './fileJsonUI.js'; // Adjust the path as necessary

export function myInscriptionUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // State tracking variable
    let currentState = 'walletList'; // 'walletList' or 'jsonView'

    // Title
    const title = document.createElement('h1');
    title.textContent = 'My Inscriptions';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        if (currentState === 'walletList') {
            mintSelectionUI(); // Go back to mint selection UI
        } else if (currentState === 'jsonView') {
            showWalletList(); // Go back to the wallet list
        }
    });
    landingPage.appendChild(backButton);

    // Scrollable iframe container
    const iframe = document.createElement('iframe');
    iframe.className = 'scrollable-iframe'; // Add a class for styling
    iframe.style.width = '300px'; // Set width
    iframe.style.height = '550px'; // Set height to make it shorter
    iframe.style.border = '1px solid #000'; // Add border
    iframe.style.overflow = 'auto'; // Enable scrolling
    landingPage.appendChild(iframe);

    // Copy to Clipboard button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.className = 'styled-button'; // Use a class for styling
    copyButton.addEventListener('click', () => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const pre = doc.querySelector('pre');
        if (pre) {
            navigator.clipboard.writeText(pre.textContent).then(() => {
                alert('JSON data copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    });
    landingPage.appendChild(copyButton);

    // View JSON button
    const viewJsonButton = document.createElement('button');
    viewJsonButton.textContent = 'View JSON';
    viewJsonButton.className = 'styled-button'; // Use a class for styling
    viewJsonButton.addEventListener('click', () => {
        fileJsonUI(); // Call the new UI function
    });
    landingPage.appendChild(viewJsonButton);

    // Function to display the wallet list
    function showWalletList() {
        currentState = 'walletList';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        // Retrieve and process 'MyInscriptions' from localStorage
        const myInscriptions = JSON.parse(localStorage.getItem('MyInscriptions')) || [];

        // Create a map of addresses to inscriptions
        const addressMap = {};

        myInscriptions.forEach(inscription => {
            const address = inscription.sendingaddress || 'Wallet Not defined';
            if (!addressMap[address]) {
                addressMap[address] = [];
            }
            addressMap[address].push(inscription);
        });

        // Display the addresses with clickable links for JSON views
        for (const address in addressMap) {
            const addressItem = doc.createElement('div');
            addressItem.className = 'address-item'; // Use a class for styling
            addressItem.textContent = address;
            body.appendChild(addressItem);

            // Create links for Ordinals Wallet and Doggy Market
            const ordinalsLink = doc.createElement('div');
            ordinalsLink.className = 'json-link'; // Use a class for styling
            ordinalsLink.textContent = 'Ordinals Wallet json';
            ordinalsLink.style.cursor = 'pointer';
            ordinalsLink.style.marginLeft = '20px'; // Indent the link
            ordinalsLink.addEventListener('click', () => {
                showOrdinalsJson(addressMap[address]);
            });
            body.appendChild(ordinalsLink);

            const doggyLink = doc.createElement('div');
            doggyLink.className = 'json-link'; // Use a class for styling
            doggyLink.textContent = 'Doggy Market json';
            doggyLink.style.cursor = 'pointer';
            doggyLink.style.marginLeft = '20px'; // Indent the link
            doggyLink.addEventListener('click', () => {
                showDoggyJson(addressMap[address]);
            });
            body.appendChild(doggyLink);
        }
    }

    // Function to display Ordinals Wallet JSON
    function showOrdinalsJson(inscriptions) {
        currentState = 'jsonView';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const dataToDisplay = inscriptions.map(inscription => ({
            id: `${inscription.txid}i0`,
            meta: {
                name: inscription.name
            }
        }));

        const pre = doc.createElement('pre');
        pre.className = 'json-display'; // Use a class for styling
        pre.textContent = JSON.stringify(dataToDisplay, null, 2); // Pretty print with indentation
        body.appendChild(pre);
    }

    // Function to display Doggy Market JSON
    function showDoggyJson(inscriptions) {
        currentState = 'jsonView';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const dataToDisplay = inscriptions.map(inscription => ({
            inscriptionId: `${inscription.txid}i0`,
            name: inscription.name
        }));

        const pre = doc.createElement('pre');
        pre.className = 'json-display'; // Use a class for styling
        pre.textContent = JSON.stringify(dataToDisplay, null, 2); // Pretty print with indentation
        body.appendChild(pre);
    }

    // Append the back button below the iframe
    landingPage.appendChild(backButton);

    // Initialize the UI by showing the wallet list
    showWalletList();
}
