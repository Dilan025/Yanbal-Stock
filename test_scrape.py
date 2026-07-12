import urllib.request
import re
import json

url = 'https://www.yanbal.com/pe/corporate/c/perfumes/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    # Product names are usually in something like <a class="name" ...>Product Name</a> or similar.
    # Let's just find the JSON-LD or data attributes.
    # We can use regex to find product names and images.
    # Look for "name": "...", "image": "..." within the HTML (often in javascript variables or schema.org blocks)
    
    products = []
    # Try finding product tiles
    # Yanbal uses SAP Commerce (Hybris), so classes are like 'product-item' or 'product__list--name'
    names = re.findall(r'class="name"[^>]*>\s*(.+?)\s*</a>', html)
    images = re.findall(r'<img[^>]+src="([^"]+)"[^>]*class="[^"]*product[^"]*"', html) # rough guess
    
    print(f"Found {len(names)} names")
    for n in names[:5]:
        print("-", n)
        
except Exception as e:
    print(e)
