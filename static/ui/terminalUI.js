import { landingPageUI } from './landingPageUI.js'; // Ensure this is correctly imported

export function terminalUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Apply styles to the landing page
    landingPage.className = 'terminal-landing-page'; // Use a class for styling

    // Create and style the title
    const title = document.createElement('h1');
    title.textContent = 'Terminal';
    title.className = 'terminal-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Create and style the iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'terminal-iframe'; // Add a class for styling
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = '1px solid #000';
    landingPage.appendChild(iframe);

    // Fetch the contents of /terminal and insert into the iframe
    fetch('/terminal')
        .then(response => response.text())
        .then(htmlContent => {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();
        })
        .catch(error => console.error('Error loading terminal content:', error));

    // Add Back button
    const backButton = document.createElement('button');
    backButton.id = 'back-button'; // Assign an ID for easy access
    backButton.textContent = 'Back';
    backButton.className = 'styled-button'; // Use a class for styling
    backButton.addEventListener('click', landingPageUI);
    landingPage.appendChild(backButton);
}
