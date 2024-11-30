import { mintSelectionUI } from './mintSelectionUI.js'; // Import your mintSelectionUI function
import { mintImageUI } from './mintImageUI.js';

export function imageCompressorUI() {
    const landingPage = document.getElementById('landing-page');
    landingPage.innerHTML = ''; // Clear existing content

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Mint Image';
    title.className = 'page-title';
    landingPage.appendChild(title);

    // File Input
    const fileInputLabel = document.createElement('label');
    fileInputLabel.className = 'styled-button';
    fileInputLabel.textContent = 'Choose Image';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileSelection);

    fileInputLabel.appendChild(fileInput);
    landingPage.appendChild(fileInputLabel);

    // Compress Button
    const compressButton = document.createElement('button');
    compressButton.textContent = 'Compress';
    compressButton.className = 'styled-button';
    compressButton.addEventListener('click', compressImage);
    landingPage.appendChild(compressButton);

    // Progress Display
    const progressDisplay = document.createElement('p');
    progressDisplay.className = 'progress-display';
    landingPage.appendChild(progressDisplay);

    // Image Container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    imageContainer.style.position = 'relative';
    imageContainer.style.width = '200px'; // Updated width
    imageContainer.style.height = '200px'; // Updated height
    imageContainer.style.border = '1px solid #ccc'; // Optional border
    imageContainer.style.margin = '20px auto'; // Center the container
    landingPage.appendChild(imageContainer);

    // Image Display
    const imageDisplay = document.createElement('img');
    imageDisplay.className = 'compressed-image';
    imageDisplay.style.maxWidth = '100%';
    imageDisplay.style.maxHeight = '100%';
    imageDisplay.style.objectFit = 'contain';
    imageContainer.appendChild(imageDisplay);

    // Compression Quality Slider ('C')
    const qualitySliderContainer = document.createElement('div');
    qualitySliderContainer.style.position = 'absolute';
    qualitySliderContainer.style.top = '50px';
    qualitySliderContainer.style.left = '-200px'; // Move further outside
    qualitySliderContainer.style.height = '100%';
    qualitySliderContainer.style.display = 'flex';
    qualitySliderContainer.style.flexDirection = 'column';
    qualitySliderContainer.style.alignItems = 'center';

    const qualitySlider = document.createElement('input');
    qualitySlider.type = 'range';
    qualitySlider.min = '0.1';
    qualitySlider.max = '0.8';
    qualitySlider.step = '0.01';
    qualitySlider.value = '0.8';
    qualitySlider.style.transform = 'rotate(270deg)';
    qualitySlider.style.width = '300px'; // Length of the slider
    qualitySlider.addEventListener('input', () => {
        // Optionally update something
    });
    qualitySliderContainer.appendChild(qualitySlider);

    imageContainer.appendChild(qualitySliderContainer);

    // Scale Slider ('S')
    const scaleSliderContainer = document.createElement('div');
    scaleSliderContainer.style.position = 'absolute';
    scaleSliderContainer.style.top = '50px';
    scaleSliderContainer.style.right = '-200px'; // Move further outside
    scaleSliderContainer.style.height = '100%';
    scaleSliderContainer.style.display = 'flex';
    scaleSliderContainer.style.flexDirection = 'column';
    scaleSliderContainer.style.alignItems = 'center';

    const scaleSlider = document.createElement('input');
    scaleSlider.type = 'range';
    scaleSlider.min = '0.1';
    scaleSlider.max = '0.8';
    scaleSlider.step = '0.01';
    scaleSlider.value = '0.8';
    scaleSlider.style.transform = 'rotate(270deg)';
    scaleSlider.style.width = '300px'; // Length of the slider
    scaleSlider.addEventListener('input', () => {
        // Optionally update something
    });
    scaleSliderContainer.appendChild(scaleSlider);

    imageContainer.appendChild(scaleSliderContainer);

    // Generate Transactions Button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Next';
    generateButton.className = 'styled-button';
    generateButton.addEventListener('click', () => {
        const pendingHexData = readFromLocalStorage('pendingHexData'); // Use helper function
        if (pendingHexData) {
            alert('There are pending transactions. Continuing to inscribe UI.');
            mintImageUI();
            return;
        }

        if (imageDisplay.src) {
            fetch(imageDisplay.src)
                .then(response => response.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const dataUrl = reader.result;
                        const [header, base64Data] = dataUrl.split(',');
                        const mimeMatch = header.match(/:(.*?);/);

                        if (mimeMatch && mimeMatch[1]) {
                            const mimeType = mimeMatch[1];
                            console.log('MIME Type:', mimeType);
                            console.log('Base64 Data:', base64Data);

                            // Calculate and display the size from Base64
                            const base64SizeKB = calculateBase64Size(base64Data);
                            progressDisplay.textContent = `Compressed, Q : ${(qualitySlider.value * 100).toFixed(0)}%, S : ${(scaleSlider.value * 100).toFixed(0)}%, Size: ${base64SizeKB} KB`;

                            if (base64SizeKB < 45) {
                                const hexData = base64ToHex(base64Data);
                                console.log('Hex Data:', hexData);

                                // Save MIME type and hex data to local storage
                                writeToLocalStorage('pendingHexData', { mimeType, hexData }); // Use helper function

                                // Navigate to mintImageUI
                                mintImageUI();
                            } else {
                                alert('Image larger than 50 KB. Increase compression and try again.');
                            }
                        } else {
                            console.error('Failed to extract MIME type.');
                        }
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(error => {
                    console.error('Error fetching blob:', error);
                });
        } else {
            console.log('No image data available.');
        }
    });
    landingPage.appendChild(generateButton);

    // Back Button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.className = 'styled-button back-button';
    backButton.addEventListener('click', () => {
        mintSelectionUI();
    });
    landingPage.appendChild(backButton);

    // Selected File Reference
    let selectedFile = null;

    // Handle File Selection
    function handleFileSelection(event) {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            const imageUrl = URL.createObjectURL(selectedFile);
            imageDisplay.src = imageUrl;
            progressDisplay.textContent = `${(selectedFile.size / 1024).toFixed(2)} KB`;
        }
    }

    // Compress Image Function
    async function compressImage() {
        if (!selectedFile) {
            alert('Please select an image first.');
            return;
        }

        const quality = parseFloat(qualitySlider.value);
        const scale = parseFloat(scaleSlider.value);

        progressDisplay.textContent = 'Compressing... Please wait.';
        compressButton.disabled = true;

        try {
            const imageBitmap = await createImageBitmap(selectedFile);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas dimensions
            const newWidth = Math.round(imageBitmap.width * scale);
            const newHeight = Math.round(imageBitmap.height * scale);
            canvas.width = newWidth;
            canvas.height = newHeight;

            // Draw image onto canvas
            ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

            // Convert canvas to data URL with specified quality
            const dataUrl = canvas.toDataURL('image/jpeg', quality);

            // Convert data URL to Blob
            const compressedBlob = dataURLToBlob(dataUrl);

            // Create object URL for compressed image
            const compressedImageUrl = URL.createObjectURL(compressedBlob);

            // Display compressed image
            imageDisplay.onload = () => {
                // Adjust the image size to fit the container
                imageDisplay.style.width = 'auto';
                imageDisplay.style.height = 'auto';
            };
            imageDisplay.src = compressedImageUrl; // Set the source after onload is defined

            // Calculate the actual blob size in KB
            const blobSizeKB = (compressedBlob.size / 1024).toFixed(2);
            
            // Calculate the displayed size with an additional 33% for display purposes only
            const displayedSizeKB = (blobSizeKB * 1.33).toFixed(2); // Add 33% to the displayed size

            // Update the progress display with the adjusted size for display only
            progressDisplay.textContent = `${displayedSizeKB} KB`;

            console.log('Compressed image blob:', compressedBlob);
        } catch (error) {
            console.error('Compression error:', error);
            alert('An error occurred during compression.');
            progressDisplay.textContent = '';
        } finally {
            compressButton.disabled = false;
        }
    }

    // Helper function to convert data URL to Blob
    function dataURLToBlob(dataUrl) {
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], { type: mime });
    }

    // Function to calculate the size of a Base64 string
    function calculateBase64Size(base64String) {
        const padding = (base64String.match(/=+$/) || [''])[0].length;
        const base64Length = base64String.length;
        const sizeInBytes = (base64Length * 3) / 4 - padding;
        return (sizeInBytes / 1024).toFixed(2); // Convert to KB
    }

    // Function to convert Base64 to Hex
    function base64ToHex(base64String) {
        const raw = atob(base64String);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    // Helper function to read from localStorage with logging
    function readFromLocalStorage(key) {
        const data = localStorage.getItem(key);
        try {
            const parsedData = JSON.parse(data);
            console.log(`Read from localStorage [${key}]:`, parsedData);
            return parsedData;
        } catch (error) {
            console.error(`Error parsing JSON from localStorage [${key}]:`, error);
            return null; // Return null if parsing fails
        }
    }

    // Helper function to write to localStorage with logging
    function writeToLocalStorage(key, value) {
        console.log(`Write to localStorage [${key}]:`, value);
        localStorage.setItem(key, JSON.stringify(value));
    }
}
