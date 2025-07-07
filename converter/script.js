// Image Converter Tool - No backend, all in browser

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('image-files');
const fileList = document.getElementById('file-list');
const convertBtn = document.getElementById('convert-btn');
const resultDiv = document.getElementById('result');
const convertTo = document.getElementById('convert-to');

let files = [];

function updateFileList() {
    fileList.innerHTML = '';
    files.forEach((file, idx) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `${file.name} <span class="file-remove" title="Remove">&times;</span>`;
        div.querySelector('.file-remove').onclick = () => {
            files.splice(idx, 1);
            updateFileList();
        };
        fileList.appendChild(div);
    });
}

function handleFiles(selectedFiles) {
    for (const file of selectedFiles) {
        if (!['image/webp', 'image/png', 'image/jpeg'].includes(file.type)) continue;
        files.push(file);
    }
    updateFileList();
}

dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', e => {
    dropArea.classList.remove('dragover');
});
dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function getOutputMime(ext) {
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg') return 'image/jpeg';
    if (ext === 'webp') return 'image/webp';
    return 'image/png';
}

async function convertImage(file, toFormat) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            let mime = getOutputMime(toFormat);
            let quality = toFormat === 'jpg' ? 0.92 : 1.0;
            canvas.toBlob(blob => {
                if (!blob) return reject('Conversion failed');
                let outName = file.name.replace(/\.(webp|png|jpe?g)$/i, '') + '.' + toFormat;
                resolve({blob, outName});
            }, mime, quality);
        };
        img.onerror = () => reject('Invalid image');
        img.src = URL.createObjectURL(file);
    });
}

async function handleConvert() {
    if (!files.length) {
        resultDiv.textContent = 'Please add images to convert.';
        return;
    }
    convertBtn.disabled = true;
    resultDiv.textContent = 'Converting...';
    const toFormat = convertTo.value;
    let results = [];
    for (const file of files) {
        try {
            const res = await convertImage(file, toFormat);
            results.push(res);
        } catch (e) {
            resultDiv.textContent = 'Error converting some images.';
        }
    }
    if (results.length === 1) {
        const {blob, outName} = results[0];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outName;
        a.click();
        URL.revokeObjectURL(url);
        resultDiv.textContent = 'Download started!';
    } else if (results.length > 1) {
        // Multiple files: zip them
        resultDiv.textContent = 'Preparing ZIP...';
        const zip = new JSZip();
        results.forEach(({blob, outName}) => zip.file(outName, blob));
        zip.generateAsync({type: 'blob'}).then(zipBlob => {
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted_images.zip';
            a.click();
            URL.revokeObjectURL(url);
            resultDiv.textContent = 'ZIP download started!';
        });
    } else {
        resultDiv.textContent = 'No images converted.';
    }
    convertBtn.disabled = false;
}

convertBtn.addEventListener('click', handleConvert);

// Add JSZip from CDN
const jszipScript = document.createElement('script');
jszipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
document.head.appendChild(jszipScript);

// Format toggle group logic
const formatToggles = document.querySelectorAll('.format-toggle');
formatToggles.forEach(btn => {
    btn.addEventListener('click', function() {
        formatToggles.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('convert-to').value = this.getAttribute('data-format');
    });
}); 