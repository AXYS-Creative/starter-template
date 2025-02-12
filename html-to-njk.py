import os

# Set the directory where your files are located
directory = "src"  # Change this if needed

# Loop through all files in the directory and subdirectories
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):  # Look for .html files
            old_path = os.path.join(root, file)
            new_path = os.path.join(root, file.replace(".html", ".njk"))

            # Rename the file
            os.rename(old_path, new_path)
            print(f"Renamed: {old_path} -> {new_path}")

print("All .html files have been renamed to .njk!")
