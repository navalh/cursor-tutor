#####################
# Welcome to Cursor #
#####################

'''
Step 1: Try generating with Cmd+K or Ctrl+K on a new line. Ask for CLI-based game of TicTacToe.

Step 2: Hit Cmd+L or Ctrl+L and ask the chat what the code does. 
   - Then, try running the code

Step 3: Try highlighting all the code with your mouse, then hit Cmd+k or Ctrl+K. 
   - Instruct it to change the game in some way (e.g. add colors, add a start screen, make it 4x4 instead of 3x3)

Step 4: To try out cursor on your own projects, go to the file menu (top left) and open a folder.
'''

import pandas as pd
import random
import time
import requests
from pytrends.exceptions import TooManyRequestsError
from pytrends.request import TrendReq


pytrend = TrendReq()


def get_all_pokemon_names():
    url = "https://pokeapi.co/api/v2/pokemon?limit=10000"
    response = requests.get(url)
    data = response.json()
    pokemon_names = [pokemon['name'] for pokemon in data['results']]
    return pokemon_names

# Define the list of Pokemon names
pokemon_names = get_all_pokemon_names()



# Create an empty DataFrame to store the interest over time data
interest_over_time_df = pd.DataFrame()

# Pull data from Google Search Trends for each Pokemon

for pokemon in pokemon_names:
    success = False
    retries = 0
    interest_over_time = pd.DataFrame()  # Initialize as an empty DataFrame
    while not success and retries < 5:
        try:
            pytrend.build_payload(kw_list=[pokemon])
            interest_over_time = pytrend.interest_over_time()
            success = True
        except TooManyRequestsError:
            time.sleep((2 ** retries) + random.randint(0, 1000) / 1000)  # Exponential backoff plus some randomness
            retries += 1
    if not interest_over_time.empty:
        if 'isPartial' in interest_over_time.columns:
            interest_over_time = interest_over_time.drop(labels=['isPartial'], axis='columns')
        interest_over_time_df = pd.concat([interest_over_time_df, interest_over_time], axis=1)

# Calculate the average interest for each Pokemon
average_interest = interest_over_time_df.mean().sort_values(ascending=False)

# Print the most popular Pokemon ranked by popularity
print("Most popular Pokemon ranked by popularity:")
print(average_interest)

