const Discord = require('discord.js');
const data = require('../models/site-ban.js');
const databakim = require('../models/bakim.js');
const c = require("../settings.json");
const ch = require("../channels.json");
exports.run = async (client,message,args) => {
if(!c.owner.includes(message.author.id)) return  message.reply('Bunu yapmaya yetkin yok.')
if(args[0] == "ban") {
  let member = message.mentions.members.first() || args[1];
  let sebep = args.slice(2).join(" ") ? args.slice(2).join(" ") : 'Belirtilmemiş';
  if(!member) return message.reply("Bir üye etiketlemelisin.");
  client.users.fetch(member.id || member).then(a => {
  const tebriklerkanks = new Discord.MessageEmbed()
  .setAuthor(a.tag, a.avatarURL({dynamic: true}))
  .setThumbnail(client.user.avatarURL())
  .setDescription(`Tebrikler, **${a.tag}** isimli kullanıcının **panel erişimini** __${sebep}__ sebebiyle engellendiniz.`)
  .setColor("GREEN")
  .setTitle("BAŞARILI")
  message.channel.send(tebriklerkanks);
  new data({user: a.id, sebep: sebep, yetkili: message.author.id}).save()
  });
}
if(args[0] == "unban") {
  let member = message.mentions.members.first() || args[1];
  if(!member) return message.reply("bir üye etiketlemelisin.");
  client.users.fetch(member.id || member).then(a => {
  const tebriklerkanks = new Discord.MessageEmbed()
  .setAuthor(a.tag, a.avatarURL({dynamic: true}))
  .setThumbnail(client.user.avatarURL())
  .setDescription(`Tebrikler, **${a.tag}** isimli kullanıcının **panel erişim** engelini açtınız.`)
  .setColor("GREEN")
  .setTitle("BAŞARILI")
  message.channel.send(tebriklerkanks);
  data.deleteOne({user: a.id}, function (error, user) { 
  if(error) console.log(error)
  })
  });
}

if(args[0] == "bakım") {
if(args[1] == "aç") {
    const d = await databakim.findOne({server: message.guild.id});
    if(d) return message.reply("site zaten bakıma alınmış.")
    let reason = args.slice(2).join(" ");
    if(!reason) return message.reply("bir sebep girmelisin.");
    const tebriklerkanks = new Discord.MessageEmbed()
    .setAuthor(message.author.tag, message.author.avatarURL({dynamic: true}))
    .setThumbnail(client.user.avatarURL())
    .setDescription(`Tebrikler, **siteyi** \`${reason}\` sebebiyle bakıma alıp, kapattınız.`)
    .setColor("GREEN")
    .setTitle("BAŞARILI")
    message.channel.send(tebriklerkanks);
    const bakimmesaj = new Discord.MessageEmbed()
    .setAuthor(message.author.tag, message.author.avatarURL({dynamic: true}))
    .setThumbnail(client.user.avatarURL())
    .setDescription("CodeList **bakım** modu aktif edildi!")
    .addField("Yetkili", message.author)
    .addField("Sebep", reason)
    .setColor("BLUE")
    client.channels.cache.get(ch.webstatus).send(`Site**${reason}** sebebiyle bakıma alındı!`).then(a => { 
        new databakim({server: message.guild.id, reason: reason, bakimmsg: a.id}).save();
    })
}
if(args[1] == "kapat") {
    const d = await databakim.findOne({server: message.guild.id});
    if(!d) return message.reply("site zaten bakıma alınmamış.")
    const tebriklerkanks = new Discord.MessageEmbed()
    .setAuthor("www.codelist.ml", client.user.avatarURL())
    .setThumbnail(client.user.avatarURL())
    .setDescription(`Tebrikler, **${d.reason}** sebebiyle kapanmış olan CodeList'i tekrar açtınız.`)
    .setColor("GREEN")
    .setTitle("BAŞARILI")
    message.channel.send(tebriklerkanks);
    client.channels.cache.get(ch.webstatus).messages.fetch(d.bakimmsg).then(a => { a.edit(`~~ CodeList **${d.reason}** sebebi ile __bakım__ moduna alındı. ~~`, bakimbitti) } )
    const bakimbitti = new Discord.MessageEmbed()
    .setAuthor("www.codelist.ml", client.user.avatarURL())
    .setThumbnail(client.user.avatarURL())
    .setColor("GREEN")
    .setDescription(`CodeList are **active** again!\n[Tıkla ve git.](https://www.codelist.ml/)`)
    .setFooter("CodeList © Tüm hakları saklıdır.");
    client.channels.cache.get(ch.webstatus).send(".").then(b => { b.delete({ timeout: 500 })})
    databakim.deleteOne({server: message.guild.id}, function (error, server) { 
    if(error) console.log(error)
    });
}
}

}
module.exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ["site"],
  };
  
  module.exports.help = {
    name: "dashboard",
    description: "",
    usage: ""
  };