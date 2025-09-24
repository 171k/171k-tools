// <script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('pdf-file');
const fileListDiv = document.getElementById('file-list');
const extractBtn = document.getElementById('extract-btn');
const resultDiv = document.getElementById('result');
const pageSelectArea = document.getElementById('page-select-area');
const pageRangeInput = document.getElementById('page-range');
let selectedFile = null;
let totalPages = 0;

function updateFileList() {
    fileListDiv.innerHTML = '';
    if (!selectedFile) return;
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `${selectedFile.name} <span class="file-remove" title="Remove">&times;</span>`;
    fileListDiv.appendChild(div);
    div.querySelector('.file-remove').onclick = () => {
        selectedFile = null;
        totalPages = 0;
        extractBtn.disabled = true;
        pageSelectArea.style.display = 'none';
        updateFileList();
        resultDiv.textContent = '';
    };
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
    if (files.length > 0) {
        selectedFile = files[0];
        handleFileSelected();
    }
});

dropArea.addEventListener('click', () => fileInput.click());
dropArea.querySelector('.file-label').onclick = (e) => {
    e.stopPropagation();
    fileInput.click();
};

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
        selectedFile = files[0];
        handleFileSelected();
    }
    fileInput.value = '';
});

function handleFileSelected() {
    updateFileList();
    resultDiv.textContent = '';
    extractBtn.disabled = true;
    pageSelectArea.style.display = 'none';
    if (!selectedFile) return;
    // Load PDF to get total pages
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(e.target.result);
            totalPages = pdfDoc.getPageCount();
            pageSelectArea.style.display = '';
            pageRangeInput.placeholder = `e.g. 1-${totalPages}`;
            extractBtn.disabled = false;
        } catch (err) {
            resultDiv.textContent = 'Error reading PDF: ' + (err.message || err);
            selectedFile = null;
            totalPages = 0;
            updateFileList();
        }
    };
    reader.readAsArrayBuffer(selectedFile);
}

updateFileList();

extractBtn.addEventListener('click', async function() {
    if (!selectedFile) {
        resultDiv.textContent = 'Please select a PDF file.';
        return;
    }
    let pageRange = pageRangeInput.value.trim();
    if (!pageRange) {
        resultDiv.textContent = 'Please enter the pages to extract.';
        return;
    }
    // Parse page range (e.g. 1-3,5)
    let pages = parsePageRange(pageRange, totalPages);
    if (!pages.length) {
        resultDiv.textContent = 'Invalid page range.';
        return;
    }
    resultDiv.textContent = 'Extracting...';
    extractBtn.disabled = true;
    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const newPdf = await PDFLib.PDFDocument.create();
        const indices = pages.map(p => p - 1); // pdf-lib is 0-based
        const copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const newPdfBytes = await newPdf.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        resultDiv.innerHTML = `<a href="${url}" class="download-btn" download="extracted.pdf">Download extracted PDF</a>`;
    } catch (err) {
        resultDiv.textContent = 'Error: ' + (err.message || err);
    } finally {
        extractBtn.disabled = false;
    }
});

function parsePageRange(input, maxPage) {
    // Accepts formats like: 1-3,5,7
    let pages = [];
    input.split(',').forEach(part => {
        part = part.trim();
        if (/^\d+$/.test(part)) {
            let num = parseInt(part, 10);
            if (num >= 1 && num <= maxPage) pages.push(num);
        } else if (/^(\d+)-(\d+)$/.test(part)) {
            let [start, end] = part.split('-').map(x => parseInt(x, 10));
            if (start >= 1 && end <= maxPage && start <= end) {
                for (let i = start; i <= end; i++) pages.push(i);
            }
        }
    });
    // Remove duplicates and sort
    return Array.from(new Set(pages)).sort((a, b) => a - b);
} 
