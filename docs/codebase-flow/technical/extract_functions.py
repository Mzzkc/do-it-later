import os
import re
import json

def extract_functions(file_path):
    """Extract function definitions from a JavaScript file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    functions = []
    
    # Pattern for methods in classes (including constructor)
    class_method_pattern = r'^\s{2,}(\w+)\s*\([^)]*\)\s*\{'
    # Pattern for object methods
    object_method_pattern = r'^\s*(\w+):\s*function\s*\([^)]*\)'
    # Pattern for arrow functions in objects
    arrow_pattern = r'^\s*(\w+):\s*\([^)]*\)\s*=>'
    # Pattern for regular object methods without function keyword
    method_pattern = r'^\s*(\w+)\([^)]*\)\s*\{'
    
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        # Check for class methods
        match = re.match(class_method_pattern, line)
        if match:
            functions.append({
                'name': match.group(1),
                'line': i,
                'type': 'class_method'
            })
            continue
        
        # Check for object methods
        match = re.match(object_method_pattern, line)
        if match:
            functions.append({
                'name': match.group(1),
                'line': i,
                'type': 'object_method'
            })
            continue
        
        # Check for arrow functions
        match = re.match(arrow_pattern, line)
        if match:
            functions.append({
                'name': match.group(1),
                'line': i,
                'type': 'arrow_function'
            })
            continue
        
        # Check for regular methods
        match = re.match(method_pattern, line)
        if match and match.group(1) not in ['if', 'for', 'while', 'switch', 'catch']:
            functions.append({
                'name': match.group(1),
                'line': i,
                'type': 'method'
            })
    
    return functions

# Process all JavaScript files
scripts_dir = '/home/emzi/Projects/do-it-later/scripts'
modules = {}

for filename in os.listdir(scripts_dir):
    if filename.endswith('.js') and filename != 'qrcode.min.js':
        file_path = os.path.join(scripts_dir, filename)
        functions = extract_functions(file_path)
        module_name = filename.replace('.js', '')
        modules[module_name] = {
            'file': filename,
            'path': file_path,
            'functions': functions,
            'function_count': len(functions)
        }

# Output JSON
output = {
    'total_modules': len(modules),
    'total_functions': sum(m['function_count'] for m in modules.values()),
    'modules': modules
}

print(json.dumps(output, indent=2))
