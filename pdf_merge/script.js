// You need to include pdf-lib via CDN in index.html for this to work
// <script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('pdf-files');
const fileListDiv = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const resultDiv = document.getElementById('result');
let selectedFiles = [];

function updateFileList() {
    fileListDiv.innerHTML = '';
    if (selectedFiles.length === 0) {
        // Do not show any message when empty
        return;
    }
    selectedFiles.forEach((file, idx) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `${file.name} <span class="file-remove" data-idx="${idx}" title="Remove">&times;</span>`;
        fileListDiv.appendChild(div);
    });
    // Remove handler
    fileListDiv.querySelectorAll('.file-remove').forEach(el => {
        el.onclick = (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            selectedFiles.splice(idx, 1);
            updateFileList();
        };
    });
}

// Drag and drop events
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('dragover');
    });
});
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('dragover');
    });
});
dropArea.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    selectedFiles = selectedFiles.concat(files);
    updateFileList();
});

dropArea.addEventListener('click', () => fileInput.click());
dropArea.querySelector('.file-label').onclick = (e) => {
    e.stopPropagation();
    fileInput.click();
};

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    selectedFiles = selectedFiles.concat(files);
    updateFileList();
    fileInput.value = '';
});

updateFileList();

mergeBtn.addEventListener('click', async function() {
    if (!selectedFiles.length || selectedFiles.length < 2) {
        resultDiv.textContent = 'Please select at least two PDF files.';
        return;
    }
    resultDiv.textContent = 'Merging...';
    mergeBtn.disabled = true;
    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        resultDiv.innerHTML = `<a href="${url}" class="download-btn" download="merged.pdf">Download merged PDF</a>`;
    } catch (err) {
        resultDiv.textContent = 'Error: ' + (err.message || err);
    } finally {
        mergeBtn.disabled = false;
    }
}); 