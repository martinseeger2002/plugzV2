import { mainSplashUI } from './ui/mainSplashUI.js';

document.addEventListener('DOMContentLoaded', () => {
    mainSplashUI();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./static/minter-service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
