import os
import re

def merge_classes(match):
    class1 = match.group(1).strip()
    class2 = match.group(2).strip()
    return f'class="{class1} {class2}"'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find elements with two class attributes
    # E.g., class="class1" class="class2" -> class="class1 class2"
    # Note: this simple regex assumes class="something" without internal quotes that break it
    pattern = r'class="([^"]+)"\s+class="([^"]+)"'

    new_content, count = re.subn(pattern, merge_classes, content)

    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {count} duplicates in {filepath}")
        return True
    return False

def main():
    dirs_to_scan = ['src/routes', 'src/lib/components']
    files_fixed = 0
    for d in dirs_to_scan:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.svelte'):
                    filepath = os.path.join(root, file)
                    if process_file(filepath):
                        files_fixed += 1

    print(f"Cleanup complete. Modified {files_fixed} files.")

if __name__ == '__main__':
    main()
