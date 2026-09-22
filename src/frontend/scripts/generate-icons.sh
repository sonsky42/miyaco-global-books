#!/bin/bash

# Script to generate PWA icons from the source icon.png
# Requires ImageMagick to be installed: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)

SOURCE_ICON="public/assets/icon.png"
OUTPUT_DIR="public/assets"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Linux: sudo apt-get install imagemagick"
    exit 1
fi

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Source icon not found at $SOURCE_ICON"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate icons in various sizes
echo "Generating PWA icons..."

convert "$SOURCE_ICON" -resize 72x72 "$OUTPUT_DIR/icon-72.png"
echo "✓ Generated icon-72.png"

convert "$SOURCE_ICON" -resize 96x96 "$OUTPUT_DIR/icon-96.png"
echo "✓ Generated icon-96.png"

convert "$SOURCE_ICON" -resize 128x128 "$OUTPUT_DIR/icon-128.png"
echo "✓ Generated icon-128.png"

convert "$SOURCE_ICON" -resize 144x144 "$OUTPUT_DIR/icon-144.png"
echo "✓ Generated icon-144.png"

convert "$SOURCE_ICON" -resize 152x152 "$OUTPUT_DIR/icon-152.png"
echo "✓ Generated icon-152.png"

convert "$SOURCE_ICON" -resize 192x192 "$OUTPUT_DIR/icon-192.png"
echo "✓ Generated icon-192.png"

convert "$SOURCE_ICON" -resize 384x384 "$OUTPUT_DIR/icon-384.png"
echo "✓ Generated icon-384.png"

convert "$SOURCE_ICON" -resize 512x512 "$OUTPUT_DIR/icon-512.png"
echo "✓ Generated icon-512.png"

echo ""
echo "All icons generated successfully in $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Verify the icons look good at different sizes"
echo "2. Deploy your application"
echo "3. Test PWA installation on mobile and desktop devices"
