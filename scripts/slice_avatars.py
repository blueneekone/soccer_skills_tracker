import cv2
import os
import glob

def process_avatars(raw_dir, processed_dir):
    # Ensure the output directory exists
    if not os.path.exists(processed_dir):
        os.makedirs(processed_dir)

    # Grab all JPEGs from the raw directory
    image_paths = glob.glob(os.path.join(raw_dir, '*.jpeg')) + glob.glob(os.path.join(raw_dir, '*.jpg'))
    
    if not image_paths:
        print("No raw avatars found to process.")
        return

    for img_path in image_paths:
        img = cv2.imread(img_path)
        if img is None: 
            continue

        h, w = img.shape[:2]
        target_ratio = 5 / 7
        current_ratio = w / h

        # Calculate Center Crop
        if current_ratio > target_ratio:
            # Image is too wide, crop the width
            new_w = int(h * target_ratio)
            start_x = (w - new_w) // 2
            cropped = img[:, start_x:start_x + new_w]
        else:
            # Image is too tall, crop the height
            new_h = int(w / target_ratio)
            start_y = (h - new_h) // 2
            cropped = img[start_y:start_y + new_h, :]

        # Resize to standard TCG dimensions (731x1024)
        resized = cv2.resize(cropped, (731, 1024), interpolation=cv2.INTER_AREA)

        # Save to the processed directory
        base_name = os.path.basename(img_path)
        out_path = os.path.join(processed_dir, base_name)
        cv2.imwrite(out_path, resized)
        print(f"Successfully processed and sliced: {base_name}")

if __name__ == "__main__":
    # Define your paths here
    raw_directory = 'src/assets/avatars/raw'
    processed_directory = 'src/assets/avatars/processed'
    process_avatars(raw_directory, processed_directory)