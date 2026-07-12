import urllib.request
import json
import os

urls = [
    ("Protección Solar", "https://www.yanbal.com/pe/corporate/adultos/c/proteccion-solar-rostro-y-cuerpo"),
    ("Tratamiento Facial", "https://www.yanbal.com/pe/corporate/c/tratamiento-facial"),
    ("Cuidado Personal", "https://www.yanbal.com/pe/corporate/c/cuidado-personal"),
    ("Maquillaje", "https://www.yanbal.com/pe/corporate/c/maquillaje"),
    ("Perfumes", "https://www.yanbal.com/pe/corporate/c/perfumes"),
    ("Joyería", "https://www.yanbal.com/pe/corporate/c/joyeria"),
    ("Hombres", "https://www.yanbal.com/pe/corporate/c/hombres"),
    ("Niños y Bebés", "https://www.yanbal.com/pe/corporate/c/ninos-y-bebes")
]

catalog = []

for category, base_url in urls:
    page = 0
    while True:
        url = f"{base_url}/results?q=%3Aname-asc&page={page}"
        print(f"Fetching {category} page {page}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            response = urllib.request.urlopen(req).read().decode('utf-8')
            data = json.loads(response)
            
            results = data.get('results', [])
            if not results:
                break
                
            for p in results:
                name = p.get('name', '').strip()
                
                # Get image
                img_url = ""
                images = p.get('images', [])
                if images:
                    for img in images:
                        if img.get('format') == 'zoom':
                            img_url = "https://www.yanbal.com" + img.get('url', '')
                            break
                    if not img_url and images[0].get('url'):
                        img_url = "https://www.yanbal.com" + images[0].get('url')
                
                if name:
                    catalog.append({
                        "name": name,
                        "category": category,
                        "imageUrl": img_url
                    })
                    
            page += 1
            
        except Exception as e:
            print(f"Error fetching {category} page {page}: {e}")
            break

unique_catalog = {}
for p in catalog:
    unique_catalog[p['name']] = p

final_list = list(unique_catalog.values())
print(f"Total products extracted: {len(final_list)}")

os.makedirs('src/data', exist_ok=True)
with open('src/data/catalog.json', 'w', encoding='utf-8') as f:
    json.dump(final_list, f, ensure_ascii=False, indent=2)

print("Saved to src/data/catalog.json")
