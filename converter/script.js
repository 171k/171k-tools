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
        const lowerName = (file.name || '').toLowerCase();
        const allowedMimes = ['image/webp', 'image/png', 'image/jpeg', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
        const allowedExt = /(\.(webp|png|jpe?g|avif|svg|ico))$/i;
        if (!(allowedMimes.includes(file.type) || allowedExt.test(lowerName))) continue;
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
    if (ext === 'avif') return 'image/avif';
    if (ext === 'ico') return 'image/x-icon';
    return 'image/png';
}

function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

//idk most of the things that happened here, chatgpt did the magic...............
function buildIcoFromPng(pngArrayBuffer, iconWidth, iconHeight) {
    // ICO with single PNG image
    const pngBytes = new Uint8Array(pngArrayBuffer);
    const headerSize = 6; // ICONDIR
    const dirEntrySize = 16; // ICONDIRENTRY
    const totalSize = headerSize + dirEntrySize + pngBytes.length;
    const ico = new ArrayBuffer(totalSize);
    const view = new DataView(ico);
    const u8 = new Uint8Array(ico);

    // ICONDIR
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type 1 = icon
    view.setUint16(4, 1, true); // count

    // ICONDIRENTRY
    const widthByte = iconWidth >= 256 ? 0 : iconWidth;
    const heightByte = iconHeight >= 256 ? 0 : iconHeight;
    u8[6] = widthByte; // width
    u8[7] = heightByte; // height
    u8[8] = 0; // color count
    u8[9] = 0; // reserved
    view.setUint16(10, 1, true); // planes
    view.setUint16(12, 32, true); // bit count
    view.setUint32(14, pngBytes.length, true); // bytes in resource
    view.setUint32(18, headerSize + dirEntrySize, true); // image offset

    // Image data
    u8.set(pngBytes, headerSize + dirEntrySize);

    return new Blob([ico], { type: 'image/x-icon' });
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

            // ICO branch: generate a 256x256 icon from PNG data and wrap in ICO
            if (toFormat === 'ico') {
                const size = 256;
                const icoCanvas = document.createElement('canvas');
                icoCanvas.width = size;
                icoCanvas.height = size;
                const ictx = icoCanvas.getContext('2d');
                // Fit image into square while preserving aspect ratio
                const scale = Math.min(size / img.width, size / img.height);
                const drawW = Math.round(img.width * scale);
                const drawH = Math.round(img.height * scale);
                const dx = Math.floor((size - drawW) / 2);
                const dy = Math.floor((size - drawH) / 2);
                ictx.clearRect(0, 0, size, size);
                ictx.drawImage(img, dx, dy, drawW, drawH);
                icoCanvas.toBlob(async pngBlob => {
                    if (!pngBlob) return reject('ICO preparation failed');
                    try {
                        const ab = await blobToArrayBuffer(pngBlob);
                        const icoBlob = buildIcoFromPng(ab, size, size);
                        const outName = file.name.replace(/\.(webp|png|jpe?g|avif|svg|ico)$/i, '') + '.ico';
                        resolve({ blob: icoBlob, outName });
                    } catch (e) {
                        reject('ICO build failed');
                    }
                }, 'image/png');
                return;
            }

            // Other formats via canvas encoding (browser support dependent)
            const mime = getOutputMime(toFormat);
            const quality = toFormat === 'jpg' ? 0.92 : 1.0;
            canvas.toBlob(blob => {
                if (!blob) {
                    if (toFormat === 'avif') {
                        return reject('AVIF encoding not supported in this browser');
                    }
                    return reject('Conversion failed');
                }
                const outName = file.name.replace(/\.(webp|png|jpe?g|avif|svg|ico)$/i, '') + '.' + toFormat;
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
        // If Multiple files, zip them
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
