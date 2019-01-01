
# Minecraft pvpwars.net bot

This is a handy bot abusing the [mobcoin] signs on the servers at pvpwars.net.


## Installation

Clone the repo and run

`npm install`

to install all dependencies.


## Documentation

I may expand this later but this will do for now. Just read the source if there are any questions.


accounts.txt
 add : infrontof user to disable them (ex :username:password)
 add : after password to make them master (ex username:password:)

main.bot.js
 This is the main bot, it login and activates a sign then logouts
 
dropper.bot.js
 This is the dropper bot, it login and teleports to the master and 
 
buyforallcoins.bot.js
  WIP

Change server:
 open login.bot.js
 uncomment row 48
 start the bot
 look at the list and choose the name for your server (ex emerald_block)
 edit row 6 and replace sever = 'old_server' with ex server = 'emerald_block'
 comment row 48


## Contribute

Feel free to send pull request.
 
