const Discord = require('discord.js');
const { JsonDatabase } = require("wio.db");
const db = new JsonDatabase("./myDatabase.json")
const c = require("../settings.json");
module.exports.run = async (client,message,args) => {
  if(!c.owner.includes(message.author.id)) return  message.reply('bunu sadece yetkisi olanlar yapabilir.')
  if(!args[0]) return message.channel.send("Özel URL alacağın botun ID'sini girmedin.")
    if(!args[1]) return message.channel.send("Özel URL alacağın botun URL'sini girmedin.")
  db.delete(`özel_url_${args[1]}`, args[0])
  db.delete(`özel_urls_${args[0]}`, args[1])
  db.delete('url_alanlar', args[0])
console.log(db.size);
console.log(db.totalDBSize);
console.log(JsonDatabase.DBCollection);
  const embed = new Discord.MessageEmbed() 
  .setTitle(args[1])
  .setDescription(`Belirtlien botun Özel URL'si Kladır.`)
  .setColor('RANDOM')
return  message.channel.send(embed)
};
exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ["özel-url-kaldır"],
  };
  
  exports.help = {
    name: "url-kaldır",
    description: "",
    usage: ""
  };
  

