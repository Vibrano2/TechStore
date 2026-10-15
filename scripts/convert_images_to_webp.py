import os
import glob
from PIL import Image

def convert_dir_to_webp(directory, quality=82):
    png_files = glob.glob(os.path.join(directory, "*.png"))
    total_original = 0
    total_webp = 0
    converted_count = 0

    print(f"Converting PNGs in {directory} to WebP (quality={quality})...")
    for png_path in png_files:
        webp_path = os.path.splitext(png_path)[0] + ".webp"
        orig_size = os.path.getsize(png_path)
        total_original += orig_size

        try:
            with Image.open(png_path) as im:
                # If image is RGBA or P with transparency, keep RGBA
                if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                    im_converted = im.convert("RGBA")
                else:
                    im_converted = im.convert("RGB")
                
                # Maximum dimension cap of 800px to avoid wasted pixels for 200px cards
                if im_converted.width > 800 or im_converted.height > 800:
                    im_converted.thumbnail((800, 800), Image.Resampling.LANCZOS)
                
                im_converted.save(webp_path, "WEBP", quality=quality, method=5)
                
            webp_size = os.path.getsize(webp_path)
            total_webp += webp_size
            converted_count += 1
        except Exception as e:
            print(f"Error converting {png_path}: {e}")

    orig_mb = total_original / (1024 * 1024)
    webp_mb = total_webp / (1024 * 1024)
    reduction = ((total_original - total_webp) / total_original * 100) if total_original > 0 else 0

    print(f"Finished {directory}: {converted_count} files.")
    print(f"Original size: {orig_mb:.2f} MB -> WebP size: {webp_mb:.2f} MB ({reduction:.1f}% reduction)\n")
    return total_original, total_webp

if __name__ == "__main__":
    t_orig1, t_webp1 = convert_dir_to_webp("src/assets/icons/products", quality=82)
    t_orig2, t_webp2 = convert_dir_to_webp("src/assets/icons", quality=82)
    
    tot_orig = (t_orig1 + t_orig2) / (1024 * 1024)
    tot_webp = (t_webp1 + t_webp2) / (1024 * 1024)
    tot_saved = tot_orig - tot_webp
    print(f"TOTAL IMAGE SAVINGS: {tot_orig:.2f} MB -> {tot_webp:.2f} MB (Saved {tot_saved:.2f} MB)")
