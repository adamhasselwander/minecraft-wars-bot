# Minecraft pvpwars.net bot

This is a handy bot abusing the [mobcoin] signs on the servers at pvpwars.net.

## Installation

Clone the repo and run

`npm install`

to install all dependencies.

Note: to run this bot you need to have downloaded minecraft and installed **minecraft 1.8** buy running the launcher once and starting a game. The bot also needs **nodejs** and **npm**.

## Documentation

### Files

##### settings.js

This file contains all settings. There is currently only one important property `serverBlock`, this property tells the bot wich server to login to. To change server login in minecraft and hover over the server you want your bots to login to, replace the value for `serverBlock` (default value is `diamond_block` and is not working, a working value could be `Skyblock Diamond`) with the title of the text in the tooltip. 


##### accounts.txt

This is the file containing all the email and password pairs used by the bots. There is a theoretical limit at around 200 accounts but it should be possible to just clone the repo and setup another instance of the bot if youd like to run with more accounts.kk

The file has the following format
`username:password` for normal bots, or
`username:password:` for the master bot, or
`:username:password` for disabled accounts


##### bots/errors.txt

This file contains all the exceptions with their corresponding stacktrace to help debugging errors.

##### bots/times.txt

This file is used to keep track of when to run the bot `main.bot.js` for each separate account.


##### bots/usernames.txt

This is a file mapping each email (with a valid password) to a minecraft username.


### Bots

All bots can be found in the `bots/` folder.

To run a bot execute 

`node <bot> [arguments]`

inside a terminal.


##### main.bot.js

The main bots main mission is to get each account logged in to a server and rightclick on the closest [mobcoin] sign and wait until the next reward is ready.


If the sign does not exist the bot will do the following:

1. Try to execute `/is home`

2. If no island exists execute `/is` and select `Farmland`

3. If there is a sign run the normal procedure

4. Execute `/shop` and buy wood

5. If there is no craftingtable close, give up

6. Craft and place a sign

7. Run the normal procedure

The bot will try to continue running no matter what, so it is recommended to watch the bot once in a while to make sure it isn't doing something it should not.


##### buyforallcoins.bot.js

The buy for all coins bot is used to buy stuff in the `/mobcoins` shop for all mobcoins and every account. It is a lot easier to transfer 1k spawners than 1M mobcoins.


##### dropper.bot.js

The dropper bot is used for dropping items. It can be called with an argument either `inv` or `coins`.

Note: The master account will respond to `/msg <master> ./is coop <name>` with executing `/is coop <name>` and every `/tpa <master>` with `/tpaccept`, `/msg <master> ./drop inv <name>`.

`inv`:

1. Find the master account and log it in

2. For each other account

   1. Tp to master

   2. Drop all items in inventory to master

   3. Break the loop if master runs out of inventory space.

`coins`:

1. Find the master account and log it in

2. For each other account

   1. Tp to master

   2. Withdraw maximum of 2k mobcoins

   3. Drop all mobcoins to master

   4. Wait for master to deposit all mobcoins

   5. Break the loop if there are no mobcoins to withdraw


##### spectator.bot.js

This was a futile attempt to monitor the number of mobcoins for each player. Due to unkown reasons this bot never worked as expected and a line `Total coins colected` displaying how many mobcoins was collected since last start was implemented in the main bot instead. 


##### All other *.bot.js

These files are just parts used by one or more of the three main bots. 


## Contribute

Feel free to send pull request.

