/**
 * Reads an image file into a data URL suitable for preview and provider conversion.
 * @param {File} file - The image file to read.
 * @returns {Promise<string>} A promise resolving to the image data URL.
 */
export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
        reader.readAsDataURL(file);
    });
}

/**
 * Verifies that a data URL can be decoded as an image.
 * @param {string} dataUrl - The image data URL to validate.
 * @returns {Promise<void>} A promise resolving when the image is valid.
 */
export function validateImageData(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image file"));
        image.src = dataUrl;
    });
}
