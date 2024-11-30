import { vaultSelectionUI } from './vaultSelectionUI.js'; // Import the vaultSelectionUI function

export function addressBookUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // State tracking variable
    let currentState = 'contactList'; // 'contactList' or 'contactDetails' or 'addContact'

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Address Book';
    title.className = 'page-title'; // Use a class for styling
    landingPage.appendChild(title);

    // Add Contact button
    const addContactButton = document.createElement('button');
    addContactButton.textContent = 'Add Contact';
    addContactButton.className = 'styled-button'; // Use a class for styling
    addContactButton.addEventListener('click', () => {
        showAddContactScreen(); // Show the add contact screen
    });
    landingPage.appendChild(addContactButton);

    // Scrollable iframe container
    const iframe = document.createElement('iframe');
    iframe.className = 'scrollable-iframe'; // Add a class for styling
    iframe.style.width = '300px'; // Set width
    iframe.style.height = '550px'; // Set height
    iframe.style.border = '1px solid #000'; // Add border
    iframe.style.overflow = 'auto'; // Enable scrolling
    landingPage.appendChild(iframe);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button'; // Use a class for styling
    backButton.addEventListener('click', () => {
        if (currentState === 'contactDetails' || currentState === 'addContact') {
            showContactList(); // Go back to the contact list
        } else if (currentState === 'contactList') {
            vaultSelectionUI(); // Go back to vault selection UI
        }
    });
    landingPage.appendChild(backButton);

    // Function to display the contact list
    function showContactList() {
        currentState = 'contactList';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        // Retrieve and process the address book from localStorage
        const addressBook = JSON.parse(localStorage.getItem('AddressBook')) || [];

        // Display the names with clickable links for contact details
        addressBook.forEach(contact => {
            const contactItem = doc.createElement('div');
            contactItem.className = 'contact-item'; // Use a class for styling
            contactItem.textContent = contact.name;
            contactItem.style.cursor = 'pointer';
            contactItem.addEventListener('click', () => {
                showContactDetails(contact);
            });
            body.appendChild(contactItem);
        });
    }

    // Function to display contact details
    function showContactDetails(contact) {
        currentState = 'contactDetails';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const details = doc.createElement('div');
        details.className = 'contact-details'; // Use a class for styling
        details.innerHTML = `
            <p>Name: ${contact.name}</p>
            <p>Doge Address: ${contact.doge || 'N/A'}</p>
            <p>Doge Public Key: ${contact.dogePublicKey || 'N/A'}</p>
            <p>Lky Address: ${contact.lky || 'N/A'}</p>
            <p>Lky Public Key: ${contact.lkyPublicKey || 'N/A'}</p>
        `;
        body.appendChild(details);

        // Add Remove Contact button
        const removeButton = doc.createElement('button');
        removeButton.textContent = 'Remove Contact';
        removeButton.className = 'styled-button remove-button'; // Use a class for styling
        removeButton.addEventListener('click', () => {
            const addressBook = JSON.parse(localStorage.getItem('AddressBook')) || [];
            const updatedAddressBook = addressBook.filter(c => c.name !== contact.name);
            localStorage.setItem('AddressBook', JSON.stringify(updatedAddressBook));
            alert('Contact removed successfully!');
            showContactList(); // Return to contact list
        });
        body.appendChild(removeButton);
    }

    // Function to show the add contact screen
    function showAddContactScreen() {
        currentState = 'addContact';
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<html><body style="background-color: black; color: white;"></body></html>');
        doc.close();
        const body = doc.body;

        const searchBox = doc.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Enter username';
        searchBox.className = 'search-box'; // Use a class for styling
        body.appendChild(searchBox);

        const addButton = doc.createElement('button');
        addButton.textContent = 'Add';
        addButton.className = 'styled-button'; // Use a class for styling
        addButton.addEventListener('click', () => {
            const username = searchBox.value.trim();
            if (username) {
                Promise.all([
                    fetch(`/api/v1/wallets/doge/${username}`).then(response => response.json()),
                    fetch(`/api/v1/wallets/lky/${username}`).then(response => response.json())
                ])
                .then(([dogeData, lkyData]) => {
                    if (dogeData.status === 'success' || lkyData.status === 'success') {
                        const addressBook = JSON.parse(localStorage.getItem('AddressBook')) || [];
                        
                        // Fetch public keys for Doge and Lky addresses
                        const fetchPublicKey = (ticker, address) => {
                            return fetch(`/api/v1/get_public_key/${ticker}/${address}`, {
                                method: 'GET',
                                headers: {
                                    'X-API-Key': apiKey // Ensure your API key is included
                                }
                            })
                            .then(response => response.json())
                            .then(data => data.status === 'success' ? data.public_key : 'N/A')
                            .catch(error => {
                                console.error('Error fetching public key:', error);
                                return 'N/A';
                            });
                        };

                        Promise.all([
                            fetchPublicKey('doge', dogeData.address),
                            fetchPublicKey('lky', lkyData.address)
                        ])
                        .then(([dogePublicKey, lkyPublicKey]) => {
                            addressBook.push({
                                name: username,
                                doge: dogeData.status === 'success' ? dogeData.address : 'N/A',
                                lky: lkyData.status === 'success' ? lkyData.address : 'N/A',
                                dogePublicKey: dogePublicKey,
                                lkyPublicKey: lkyPublicKey
                            });
                            localStorage.setItem('AddressBook', JSON.stringify(addressBook));
                            alert('Contact added successfully!');
                            showContactList(); // Return to contact list
                        });
                    } else {
                        alert('User does not have a Doge or Lky address.');
                    }
                })
                .catch(error => {
                    console.error('Error fetching user addresses:', error);
                    alert('Error fetching user addresses.');
                });
            }
        });
        body.appendChild(addButton);
    }

    // Initialize the UI by showing the contact list
    showContactList();
}