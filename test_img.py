import urllib.request
import re

url = 'https://www.yanbal.com/pe/corporate/c/perfumes/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')
blocks = re.split(r'class="product__list--item"', html)
if len(blocks) < 2: blocks = re.split(r'class="product-item"', html)
if len(blocks) < 2: blocks = re.split(r'product-details', html)

for block in blocks[1:3]:
    name_match = re.search(r'class="name"[^>]*>\s*(.+?)\s*</a>', block)
    name = name_match.group(1).strip() if name_match else 'Unknown'
    
    # Extract all img tags
    imgs = re.findall(r'<img[^>]+>', block)
    print("NAME:", name)
    for img in imgs:
        print(" IMG:", img)
