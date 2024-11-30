import { mintFolderUI } from './mintFolderUI.js'; // Adjust the path as necessary

export function fileJsonUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // State tracking variable
    let currentState = 'initialJson'; // 'initialJson', 'dmJson', or 'owJson'

    // Title
    const title = document.createElement('h1');
    title.textContent = 'File JSON Viewer';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Scrollable iframe container
    const iframe = document.createElement('iframe');
    iframe.className = 'scrollable-iframe'; // Add a class for styling
    iframe.style.width = '300px'; // Set width
    iframe.style.height = '450px'; // Set height to make it shorter
    iframe.style.border = '1px solid #000'; // Add border
    iframe.style.overflow = 'auto'; // Enable scrolling
    landingPage.appendChild(iframe);

    // DM JSON button
    const dmJsonButton = document.createElement('button');
    dmJsonButton.textContent = 'DM JSON';
    dmJsonButton.className = 'styled-button'; // Use a class for styling
    dmJsonButton.addEventListener('click', () => {
        currentState = 'dmJson';
        showDoggyJson();
    });
    landingPage.appendChild(dmJsonButton);

    // OW JSON button
    const owJsonButton = document.createElement('button');
    owJsonButton.textContent = 'OW JSON';
    owJsonButton.className = 'styled-button'; // Use a class for styling
    owJsonButton.addEventListener('click', () => {
        currentState = 'owJson';
        showOrdinalsJson();
    });
    landingPage.appendChild(owJsonButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        if (currentState === 'initialJson') {
            mintFolderUI(); // Navigate back to Mint Folder UI
        } else {
            currentState = 'initialJson';
            showInitialJson();
        }
    });
    landingPage.appendChild(backButton);

    // Load initial JSON data into the iframe
    function showInitialJson() {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const jsonData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const pre = document.createElement('pre');
        pre.className = 'json-display'; // Use a class for styling
        pre.textContent = JSON.stringify(jsonData, null, 2); // Pretty print with indentation
        body.appendChild(pre);
    }

    // Function to display Doggy Market JSON
    function showDoggyJson() {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const jsonData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const dataToDisplay = jsonData
            .filter(item => item.inscription_id)
            .map(item => ({
                inscriptionId: `${item.txid}i0`,
                name: item.name
            }));

        const pre = document.createElement('pre');
        pre.className = 'json-display'; // Use a class for styling
        pre.textContent = JSON.stringify(dataToDisplay, null, 2); // Pretty print with indentation
        body.appendChild(pre);
    }

    // Function to display Ordinals Wallet JSON
    function showOrdinalsJson() {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const jsonData = JSON.parse(localStorage.getItem('folderFileData')) || [];
        const dataToDisplay = jsonData
            .filter(item => item.inscription_id)
            .map(item => ({
                id: `${item.txid}i0`,
                meta: {
                    name: item.name
                }
            }));

        const pre = document.createElement('pre');
        pre.className = 'json-display'; // Use a class for styling
        pre.textContent = JSON.stringify(dataToDisplay, null, 2); // Pretty print with indentation
        body.appendChild(pre);
    }

    // Initialize the UI by showing the initial JSON
    showInitialJson();
}
