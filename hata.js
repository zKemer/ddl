const { MessageEmbed } = require("discord.js")
module.exports = async (text, channel, message) => {
    let embed = new MessageEmbed()
    .setColor("#FF0000")
    .setDescription(text)
    await channel.send(embed)
}
