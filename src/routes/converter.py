from flask import Blueprint, request, jsonify
import json
import os
import tempfile

converter_bp = Blueprint('converter', __name__)

@converter_bp.route('/convert', methods=['POST'])
def convert_notebook():
    """
    Convert uploaded ipynb file to py file based on user options
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.endswith('.ipynb'):
        return jsonify({'error': 'File must be a Jupyter Notebook (.ipynb)'}), 400
    
    # Get conversion options
    options = {}
    if 'options' in request.form:
        options = json.loads(request.form['options'])
    
    include_cell_markers = options.get('includeCellMarkers', True)
    include_empty_lines = options.get('includeEmptyLines', True)
    add_comments = options.get('addComments', False)
    
    # Save uploaded file to temp location
    temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.ipynb')
    temp_input.close()
    file.save(temp_input.name)
    
    # Create temp output file
    temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='.py')
    temp_output.close()
    
    try:
        # Load the notebook
        with open(temp_input.name, "r") as f:
            notebook = json.load(f)
        
        # Convert to Python
        python_code = convert_notebook_to_py(notebook, include_cell_markers, include_empty_lines, add_comments)
        
        # Clean up temp files
        os.unlink(temp_input.name)
        os.unlink(temp_output.name)
        
        return jsonify({'code': python_code})
    
    except Exception as e:
        # Clean up temp files
        if os.path.exists(temp_input.name):
            os.unlink(temp_input.name)
        if os.path.exists(temp_output.name):
            os.unlink(temp_output.name)
        
        return jsonify({'error': str(e)}), 500

def convert_notebook_to_py(notebook, include_cell_markers=True, include_empty_lines=True, add_comments=False):
    """
    Convert notebook JSON to Python code string with customization options
    """
    python_code = []
    
    # Add header comment
    python_code.append('"""Converted from Jupyter Notebook to Python script"""')
    python_code.append('')
    
    # Get cells based on notebook format
    cells = notebook["cells"] if notebook["nbformat"] >= 4 else notebook["worksheets"][0]["cells"]
    
    for i, cell in enumerate(cells):
        # Skip non-code cells if not adding comments
        if cell.get('cell_type') != 'code' and not add_comments:
            continue
            
        # Add cell marker
        if include_cell_markers:
            python_code.append(f"\n# Cell {i+1}")
            if cell.get('cell_type') != 'code':
                python_code.append(f"# Cell Type: {cell.get('cell_type', 'unknown')}")
        
        # Add cell content
        if cell.get('cell_type') == 'code':
            # For code cells, add the source
            for line in cell.get('source', []):
                python_code.append(line.rstrip())
                
            # Add empty line after cell if option is enabled
            if include_empty_lines:
                python_code.append('')
        
        elif add_comments and cell.get('cell_type') == 'markdown':
            # For markdown cells, add as comments if option is enabled
            python_code.append("# Markdown Cell:")
            for line in cell.get('source', []):
                if line.strip():  # Skip empty lines in markdown
                    python_code.append(f"# {line.rstrip()}")
            
            # Add empty line after cell if option is enabled
            if include_empty_lines:
                python_code.append('')
    
    # Join all lines with newlines
    return '\n'.join(python_code)
