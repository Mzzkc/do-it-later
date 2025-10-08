import os
import re
import json

def analyze_module(file_path):
    """Analyze a JavaScript module for classes, functions, and dependencies."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    module_info = {
        'classes': [],
        'functions': [],
        'exports': [],
        'dependencies': []
    }
    
    # Extract classes
    class_pattern = r'^class\s+(\w+)'
    for match in re.finditer(class_pattern, content, re.MULTILINE):
        module_info['classes'].append(match.group(1))
    
    # Extract global objects (like Config, Utils, Storage)
    global_obj_pattern = r'^const\s+([A-Z]\w*)\s*=\s*\{'
    for match in re.finditer(global_obj_pattern, content, re.MULTILINE):
        module_info['exports'].append({
            'name': match.group(1),
            'type': 'object'
        })
    
    # Extract dependencies (references to other modules)
    # Look for patterns like Storage.load(), Utils.generateId(), etc.
    dep_pattern = r'\b(Config|Utils|Storage|Sync|TaskManager|Renderer|QRCode|jsQR)\.'
    dependencies = set()
    for match in re.finditer(dep_pattern, content):
        dependencies.add(match.group(1))
    module_info['dependencies'] = list(dependencies)
    
    # Count methods in classes
    if module_info['classes']:
        for class_name in module_info['classes']:
            # Find class body
            class_start = content.find(f'class {class_name}')
            if class_start != -1:
                # Find next class or end of file
                next_class = content.find('\nclass ', class_start + 1)
                class_content = content[class_start:next_class] if next_class != -1 else content[class_start:]
                
                # Count methods (looking for indented function definitions)
                method_pattern = r'^\s{2,}(\w+)\s*\([^)]*\)\s*\{'
                methods = []
                for match in re.finditer(method_pattern, class_content, re.MULTILINE):
                    method_name = match.group(1)
                    if method_name not in ['if', 'for', 'while', 'switch', 'catch', 'else']:
                        methods.append(method_name)
                
                module_info['functions'].extend([{
                    'name': f'{class_name}.{method}',
                    'type': 'class_method',
                    'class': class_name
                } for method in methods])
    
    # Count methods in global objects
    for export in module_info['exports']:
        if export['type'] == 'object':
            obj_name = export['name']
            # Find object definition
            obj_pattern = rf'^const\s+{obj_name}\s*=\s*\{{.*?^}};'
            obj_match = re.search(obj_pattern, content, re.MULTILINE | re.DOTALL)
            if obj_match:
                obj_content = obj_match.group(0)
                # Extract methods
                method_pattern = r'^\s*(\w+)\s*\([^)]*\)\s*\{'
                arrow_pattern = r'^\s*(\w+):\s*\([^)]*\)\s*=>'
                func_pattern = r'^\s*(\w+):\s*function'
                
                methods = []
                for pattern in [method_pattern, arrow_pattern, func_pattern]:
                    for match in re.finditer(pattern, obj_content, re.MULTILINE):
                        method_name = match.group(1)
                        if method_name not in ['if', 'for', 'while', 'switch', 'catch']:
                            methods.append(method_name)
                
                # Remove duplicates
                methods = list(set(methods))
                module_info['functions'].extend([{
                    'name': f'{obj_name}.{method}',
                    'type': 'object_method',
                    'object': obj_name
                } for method in methods])
    
    return module_info

# Process all JavaScript files
scripts_dir = '/home/emzi/Projects/do-it-later/scripts'
modules = {}

for filename in os.listdir(scripts_dir):
    if filename.endswith('.js') and filename != 'qrcode.min.js':
        file_path = os.path.join(scripts_dir, filename)
        module_name = filename.replace('.js', '')
        module_info = analyze_module(file_path)
        module_info['file'] = filename
        module_info['path'] = file_path
        modules[module_name] = module_info

# Create modules.json
output = {
    'total_modules': len(modules),
    'total_classes': sum(len(m['classes']) for m in modules.values()),
    'total_functions': sum(len(m['functions']) for m in modules.values()),
    'modules': modules
}

with open('/home/emzi/Projects/do-it-later/docs/codebase-flow/technical/modules.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"Created modules.json with {output['total_modules']} modules, {output['total_classes']} classes, {output['total_functions']} functions")
