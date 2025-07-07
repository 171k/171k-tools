// White Duck Theme - Image Compressor Tool JavaScript

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const results = document.getElementById('results');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Update quality display with smooth animation
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value + '%';
        qualityValue.style.transform = 'scale(1.1)';
        setTimeout(() => {
            qualityValue.style.transform = 'scale(1)';
        }, 150);
    });

    // Handle drag and drop with enhanced visual feedback
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    results.innerHTML = '';
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading"></div>
            <p>Processing your images...</p>
        </div>
    `;
    results.appendChild(loadingDiv);
    
    // Process files with delay for better UX
    setTimeout(() => {
        results.removeChild(loadingDiv);
        Array.from(files).forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                compressImage(e.target.result, file.name, index);
            };
            reader.readAsDataURL(file);
        });
    }, 1000);
}

function compressImage(src, fileName, index) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        const quality = qualitySlider.value / 100;
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Calculate file sizes
        const originalSize = getBase64Size(src);
        const compressedSize = getBase64Size(compressedDataUrl);
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        displayResult(fileName, src, compressedDataUrl, originalSize, compressedSize, savings, index);
    };
    img.src = src;
}

function getBase64Size(base64String) {
    const stringLength = base64String.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.75;
    return sizeInBytes;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayResult(fileName, originalSrc, compressedSrc, originalSize, compressedSize, savings, index) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'file-info success';
    
    const savingsColor = savings > 50 ? '#27ae60' : savings > 20 ? '#f39c12' : '#e74c3c';
    
    resultDiv.innerHTML = `
        <h3>${fileName}</h3>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
            <div style="text-align: center;">
                <h4>📸 Original</h4>
                <img src="${originalSrc}" class="image-preview" alt="Original" loading="lazy">
                <p><strong>Size:</strong> ${formatFileSize(originalSize)}</p>
            </div>
            <div style="text-align: center;">
                <h4>Compressed</h4>
                <img src="${compressedSrc}" class="image-preview" alt="Compressed" loading="lazy">
                <p><strong>Size:</strong> ${formatFileSize(compressedSize)}</p>
                <p><strong>Savings:</strong> <span style="color: ${savingsColor}; font-weight: bold;">${savings}%</span></p>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button class="download-btn" onclick="downloadImage('${compressedSrc}', '${fileName.replace(/\.[^/.]+$/, '')}_compressed.jpg')">
                Download Compressed Image
            </button>
            <button class="download-btn" onclick="downloadImage('${originalSrc}', '${fileName}')" style="background: linear-gradient(145deg, #95a5a6, #7f8c8d);">
                Download Original
            </button>
        </div>
    `;
    
    results.appendChild(resultDiv);
    
    // Add some animation
    setTimeout(() => {
        resultDiv.style.animation = 'successPulse 0.6s ease-in-out';
    }, 100);
}

function downloadImage(dataUrl, fileName) {
    // Add download success animation
    setTimeout(() => {
    }, 500);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.downloadImage = downloadImage; 