#####################
# Welcome to Cursor #
#####################

import requests
import json

url = "https://pokeapi.co/api/v2/pokemon?limit=1025"
data = requests.get(url).json()
results = []
for i, p in enumerate(data["results"], 1):
   results.append({
      "id": i,
      "name": p["name"].capitalize(),
      "sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{i}.png"
   })
with open("pokemon.json", "w") as f:
   json.dump(results, f, indent=2)