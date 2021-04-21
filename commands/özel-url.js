const Discord = require('discord.js');
const { JsonDatabase } = require("wio.db");
const db = new JsonDatabase("./myDatabase.json")
const c = require("../settings.json");
const botsdata = require("../models/botlist/bots.js");
const hata = require('../hata.js')
module.exports.run = async (client,message,args) => {
  if(!message.member.roles.cache.has("833279351852236860")) return  hata('Bunu sadece yetkisi olanlar yapabilir.'  ,message.channel)
  

  if(!args[0]) return hata("Özel URL alacağın botun ID'sini girmedin."  ,message.channel)
  
    if(!args[1]) return hata("Özel URL alacağın botun URL'sini girmedin."  ,message.channel)
     let botdata = await botsdata.findOne({
      botID: args[0]
    });
  

if(db.fetch(`özel_url_${args[0]}`)) return hata("Böyle bir Bot URL'si zaten var."  ,message.channel)
  if(db.fetch(`özel_urls_${args[1]}`)) return hata("Böyle bir Bot URL'si zaten var."  ,message.channel)
  if(!botdata) return hata("Böyle bir Bot ID'si bulunamadı."  ,message.channel)
  if(message.author.id == botdata.ownerID) {
  db.set(`özel_url_${args[1]}`, args[0])
      db.set(`özel_urls_${args[0]}`, args[1])
    db.push('url_alanlar', args[0])
console.log(db)
  const embed = new Discord.MessageEmbed() 
  .setTitle(args[1])
  .setDescription(`${client.users.cache.get(  db.fetch(`özel_url_${args[1]}`)).username} adlı botun Özel URL'si ${args[1]} olarak ayarlandı.`)
  .setColor('RANDOM')
  .setURL(`https://www.codelist.ml/url/${args[1]}`)
return  message.channel.send(embed)
  } else {return hata("Bu botun sahibi sen değilsin.",message.channel)}
};
exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ["özel-url"],
  };
  
  exports.help = {
    name: "url",
    description: "",
    usage: ""
  };
  

