import { loginUI } from './loginUI.js';

export function mainSplashUI() {
    // Apply consistent styles to the body
    document.body.className = 'splash-body'; // Use a class for styling

    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Apply consistent styles
    landingPage.className = 'splash-landing-page'; // Use a class for styling

    // Welcome message
    const welcomeMessage = document.createElement('h1');
    welcomeMessage.textContent = 'Welcome to Plugz Wallet';
    welcomeMessage.className = 'splash-welcome-message'; // Use a class for styling
    landingPage.appendChild(welcomeMessage);

    // Cool description
    const coolDescription = document.createElement('p');
    coolDescription.textContent = 'Helpful tip of the day:\n\n' + getTipOfTheDay();
    coolDescription.className = 'splash-cool-description'; // Use a class for styling
    landingPage.appendChild(coolDescription);

    // Enter button
    const enterButton = document.createElement('button');
    enterButton.textContent = 'Enter';
    enterButton.className = 'splash-enter-button'; // Use a class for styling
    enterButton.addEventListener('click', () => {
        loginUI(); // Navigate to the login screen
    });
    landingPage.appendChild(enterButton);
}

function getTipOfTheDay() {
    const tips = [
        "Remember to back up your private key and wallet address, as we do not store them. If lost, you won't be able to restore your wallet without a backup.",
        "If you encounter a 'missing input' error while inscribing, go to the user screen and clear pending transactions, then try again.",
        "To resolve errors during minting, go to the user menu and clear the mint cache.",
        "You can reuse your private key and wallet address across multiple wallets, each with a unique name, to better organize your collections.",
        "Mint credits NA? try logging out and logging back in to refresh your session.",
        "You can easily verify your inscriptions by entering your receiving address in the search bar in the chains ord explorer.",
        "Organize your collections by creating separate wallets with specific names for different groups of inscriptions.",
        "Use the 'Add to Home Screen' option on your mobile browser to install Plugz Wallet as a web app for quick access."
    ];

    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
}
