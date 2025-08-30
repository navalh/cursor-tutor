#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import os
import time
from urllib.parse import urljoin
import re

def create_output_directory():
    """Create directory for downloaded images"""
    if not os.path.exists('pokemon_cards'):
        os.makedirs('pokemon_cards')
    return 'pokemon_cards'

def get_card_detail_urls(page_num):
    """Get all card detail URLs from a specific page"""
    url = f"https://asia.pokemon-card.com/th/card-search/list/?pageNo={page_num}&expansionCodes=SV11s"
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all card links - they should be in <a> tags with href containing '/card-search/detail/'
        card_links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if '/card-search/detail/' in href:
                full_url = urljoin('https://asia.pokemon-card.com', href)
                card_links.append(full_url)
        
        return card_links
    except Exception as e:
        print(f"Error fetching page {page_num}: {e}")
        return []

def get_card_image_url(detail_url):
    """Extract card image URL from card detail page"""
    try:
        response = requests.get(detail_url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for img tags that might contain the card image
        # Based on the example, images are at /th/card-img/th00011595.png
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if '/card-img/' in src:
                return urljoin('https://asia.pokemon-card.com', src)
        
        # Alternative: extract card ID from URL and construct image URL
        # URL format: /th/card-search/detail/11595/
        match = re.search(r'/detail/(\d+)/', detail_url)
        if match:
            card_id = match.group(1)
            # Pad with zeros to match the pattern th00011595
            padded_id = f"th{card_id:08d}"
            return f"https://asia.pokemon-card.com/th/card-img/{padded_id}.png"
        
        return None
    except Exception as e:
        print(f"Error fetching card detail from {detail_url}: {e}")
        return None

def download_image(image_url, output_dir):
    """Download a single card image"""
    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Extract filename from URL
        filename = os.path.basename(image_url)
        filepath = os.path.join(output_dir, filename)
        
        # Skip if file already exists
        if os.path.exists(filepath):
            print(f"Skipping {filename} - already exists")
            return True
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"Error downloading {image_url}: {e}")
        return False

def main():
    """Main scraping function"""
    output_dir = create_output_directory()
    total_downloaded = 0
    total_failed = 0
    
    print("Starting Pokemon card scraper...")
    print(f"Downloading images from pages 1-18 to: {output_dir}")
    
    for page_num in range(1, 19):  # Pages 1 to 18
        print(f"\n=== Processing Page {page_num}/18 ===")
        
        # Get all card detail URLs from this page
        detail_urls = get_card_detail_urls(page_num)
        print(f"Found {len(detail_urls)} cards on page {page_num}")
        
        for i, detail_url in enumerate(detail_urls, 1):
            print(f"Processing card {i}/{len(detail_urls)} from page {page_num}")
            
            # Get the image URL for this card
            image_url = get_card_image_url(detail_url)
            if image_url:
                # Download the image
                if download_image(image_url, output_dir):
                    total_downloaded += 1
                else:
                    total_failed += 1
            else:
                print(f"Could not find image URL for {detail_url}")
                total_failed += 1
            
            # Small delay to be respectful to the server
            time.sleep(0.5)
        
        # Longer delay between pages
        time.sleep(2)
    
    print(f"\n=== Scraping Complete ===")
    print(f"Total images downloaded: {total_downloaded}")
    print(f"Total failures: {total_failed}")
    print(f"Images saved to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()