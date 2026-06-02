import pandas as pd

# Load CSV into a DataFrame
df = pd.read_csv("champion_id_name.csv")

#modify csv dataset
#df = df.set_index("id")

#ensure id is set index
print(df.loc[1])
print(df.iloc[1])

# Add a new column filled with None
df["special_names"] = None

special_map={
    'Vel\'Koz': ['Vel\'Koz', 'Velkoz', 'Vel Koz', 'Vel'],
    'K\'Sante': ['K\'Sante', 'KSante', 'K Sante'],
    'Kha\'Zix': ['Kha\'Zix', 'KhaZix', 'Kha Zix','Kha'],
    'Rek\'Sai': ['Rek\'Sai', 'RekSai', 'Rek Sai','Rek'],
    'Cho\'Gath': ['Cho\'Gath', 'ChoGath', 'Cho Gath','Cho'],
    'Kog\'Maw': ['Kog\'Maw', 'KogMaw', 'Kog Maw','Kog','Kogmaw'],
    'LeBlanc': ['Leblanc', 'LB', 'Le Blanc'],
    'Miss Fortune': ['Miss Fortune', 'MissFortune','MF'],
    'Master Yi': ['Master Yi', 'MasterYi','Yi'],
    'Tahm Kench': ['Tahm Kench', 'TahmKench','Tahm'],
    'Twisted Fate': ['Twisted Fate', 'TwistedFate','TF'],
    'Xin Zhao': ['Xin Zhao', 'XinZhao','Xin'],
    'Jarvan IV': ['Jarvan IV', 'JarvanIV','J4','Jarvan4'],
    'Lee Sin': ['Lee Sin', 'LeeSin','Lee', 'LS'],
    'Aurelion Sol': ['Aurelion Sol', 'AurelionSol'],
    'Dr. Mundo': ['Dr. Mundo', 'DrMundo', 'Dr Mundo','Mundo'],
    'Kai Sa': ['Kaisa', 'KaiSa', 'Kai Sa', 'Kai\'Sa'],
    'Yunara': ['Yunara', 'Yuumi'],
    'Wukong': ['MonkeyKing', 'Monkey King', 'Wukong'],
    'Renekton': ['Rene', 'Renek'],
    'Rengar': ['Rengo'],
    'Zed': ['Zedd','Z'],
    'Zoe': ['Zoey'],
    'Katarina': ['Kat'],
    'Kassadin': ['Kassa'],
    'Karthus': ['Karth'],
    'Malzahar': ['Malz'],
    'Yasuo': ['Yas'],
    'Yone': ['Yon'],
    'Jinx': ['Jin'],
}

# Iterate through each row and set the special_names if the champion is in our map
for index, row in df.iterrows():
    champ_name = row['name']
    if champ_name in special_map:
        # We store the list as a string so it saves nicely to the CSV
        df.at[index, 'special_names'] = str(special_map[champ_name])

# Save the updated DataFrame back to the CSV file
df.to_csv("champion_id_name.csv", index=False)
