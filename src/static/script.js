document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const fileInfoSection = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const optionsSection = document.getElementById('options-section');
    const previewSection = document.getElementById('preview-section');
    const codePreview = document.getElementById('code-preview');
    const convertBtn = document.getElementById('convert-btn');
    const downloadBtn = document.getElementById('download-btn');
    const toggleLayoutBtn = document.getElementById('toggle-layout');
    const mainContent = document.getElementById('main-content');
    const alertContainer = document.getElementById('alert-container');
    
    // Options elements
    const includeCellMarkers = document.getElementById('include-cell-markers');
    const includeEmptyLines = document.getElementById('include-empty-lines');
    const addComments = document.getElementById('add-comments');
    
    // State
    let currentFile = null;
    let convertedCode = null;
    let isHorizontalLayout = window.innerWidth > 768;
    
    // Initialize layout
    updateLayout();
    
    // Event Listeners
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', handleFileSelect);
    
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
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    convertBtn.addEventListener('click', convertFile);
    
    downloadBtn.addEventListener('click', downloadConvertedFile);
    
    toggleLayoutBtn.addEventListener('click', () => {
        isHorizontalLayout = !isHorizontalLayout;
        updateLayout();
    });
    
    // Option change listeners
    const optionInputs = document.querySelectorAll('.option-input');
    optionInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (convertedCode) {
                convertFile();
            }
        });
    });
    
    // Functions
    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    }
    
    function handleFiles(files) {
        const file = files[0];
        
        // Check if file is a .ipynb file
        if (!file.name.endsWith('.ipynb')) {
            showAlert('Please select a Jupyter Notebook (.ipynb) file.', 'error');
            return;
        }
        
        currentFile = file;
        
        // Display file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfoSection.style.display = 'flex';
        optionsSection.style.display = 'block';
        
        // Reset preview
        previewSection.style.display = 'none';
        codePreview.innerHTML = '';
        convertedCode = null;
        
        // Enable convert button
        convertBtn.disabled = false;
        downloadBtn.disabled = true;
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function convertFile() {
        if (!currentFile) return;
        
        // Show loading state
        showLoading(true);
        
        // Get options
        const options = {
            includeCellMarkers: includeCellMarkers.checked,
            includeEmptyLines: includeEmptyLines.checked,
            addComments: addComments.checked
        };
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('options', JSON.stringify(options));
        
        // Send to server
        fetch('/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Conversion failed');
            }
            return response.json();
        })
        .then(data => {
            convertedCode = data.code;
            displayCodePreview(convertedCode);
            downloadBtn.disabled = false;
            showLoading(false);
            showAlert('Conversion successful!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showLoading(false);
            showAlert('Error converting file. Please try again.', 'error');
        });
    }
    
    function displayCodePreview(code) {
        codePreview.innerHTML = '';
        
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'code-line';
            
            const lineNumber = document.createElement('span');
            lineNumber.className = 'line-number';
            lineNumber.textContent = index + 1;
            
            const lineContent = document.createElement('span');
            lineContent.className = 'line-content';
            lineContent.textContent = line;
            
            lineDiv.appendChild(lineNumber);
            lineDiv.appendChild(lineContent);
            codePreview.appendChild(lineDiv);
        });
        
        previewSection.style.display = 'block';
    }
    
    function downloadConvertedFile() {
        if (!convertedCode) return;
        
        const outputFilename = currentFile.name.replace('.ipynb', '.py');
        const blob = new Blob([convertedCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    function updateLayout() {
        if (isHorizontalLayout) {
            mainContent.classList.add('horizontal-layout');
            toggleLayoutBtn.innerHTML = '<i class="fas fa-columns toggle-icon"></i> Switch to Vertical Layout';
        } else {
            mainContent.classList.remove('horizontal-layout');
            toggleLayoutBtn.innerHTML = '<i class="fas fa-bars toggle-icon"></i> Switch to Horizontal Layout';
        }
    }
    
    function showLoading(isLoading) {
        const loadingElement = document.getElementById('loading');
        if (isLoading) {
            loadingElement.style.display = 'flex';
        } else {
            loadingElement.style.display = 'none';
        }
    }
    
    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alertContainer.removeChild(alert);
            }, 300);
        }, 3000);
    }
});
