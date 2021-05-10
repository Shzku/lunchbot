import Discord, { Client, TextChannel } from "discord.js";
import { engDayCast } from "../../config/words";
import Env from "@ioc:Adonis/Core/Env";
import User from "App/Models/User";
import Server from "App/Models/Server";
import Logger from "@ioc:Adonis/Core/Logger";
import Menu from "App/Types/Menu";
import { Moment } from "moment";

export function embed(data: Menu, date: Moment) {
  const embed = new Discord.MessageEmbed()
    .setFooter(
      `Lunchbot – Få lunchmenyn direkt i dina DM:s, skriv kommandot <sub.`,
      "https://i.imgur.com/QCfAJ9S.png"
    )
    .setColor(0x7289da);

  embed.setURL(
    `${Env.get("WEBSITE_BASE_URL")}?date=${date.format(
      "WW-YYYY"
    )}&format=WW-YYYY`
  );

  embed.setTitle("EATERY KISTA NOD — MENY VECKA " + data.listed_week);

  Object.keys(data.menu).forEach((value) => {
    const day = engDayCast[value] || value;
    embed.addField(day.toUpperCase(), data.menu[value].length > 0 ? data.menu[value].join("\n") : "Ingen mat serveras denna dag.");
  });

  return embed;
}

export async function dispatch(instance: Client, data: Menu, date: Moment) {
  if (!instance.user) return;

  const users = await User.all();
  const servers = await Server.all();

  const embedData = embed(data, date);

  for (const user of users) {
    try {
      const userObject: Discord.User = await instance.users.fetch(
        <string>user.user_id
      );
      const userChannel: TextChannel = <TextChannel>(
        await instance.channels.fetch(<string>user.channel_id)
      );
      const messageCollection = await userChannel.messages.fetch({
        limit: 1,
      });
      const latestMessage = messageCollection.first();

      if (
        latestMessage &&
        latestMessage.author.id === instance.user.id &&
        latestMessage.embeds.length > 0 &&
        latestMessage.embeds[0].title &&
        latestMessage.embeds[0].title.includes("EATERY") &&
        (latestMessage.embeds[0].title.match(/\d+/g) || [])[0].toString() ===
        (data.listed_week || []).toString()
      ) {
        await latestMessage.edit(embedData);
        Logger.info(
          `Edited lunch menu in ${user.user_id}, aka ${userObject.username}.`
        );
      } else {
        await userChannel.send(embedData);
        Logger.info(
          `Sent lunch menu to ${user.user_id}, aka ${userObject.username}.`
        );
      }
    } catch (error) {
      Logger.error(`Failed to send menu to ${user.user_id}`);
      console.log(error);
    }
  }

  for (const server of servers) {
    try {
      const guildChannel: TextChannel = <TextChannel>(
        await instance.channels.fetch(<string>server.channel_id)
      );
      const messageCollection = await guildChannel.messages.fetch({ limit: 1 });
      const latestMessage = messageCollection.first();
      if (
        latestMessage &&
        latestMessage.author.id === instance.user.id &&
        latestMessage.embeds.length > 0 &&
        latestMessage.embeds[0].title &&
        latestMessage.embeds[0].title.includes("EATERY") &&
        (latestMessage.embeds[0].title.match(/\d+/g) || [])[0].toString() ===
        (data.listed_week || []).toString()
      ) {
        await latestMessage.edit(embedData);
        Logger.info(
          `Edited lunch menu in ${server.channel_id} in ${server.server_id}, aka ${guildChannel.guild.name}/${guildChannel.name}.`
        );
      } else {
        await guildChannel.send(embedData);
        Logger.info(
          `Sent lunch menu to ${server.channel_id} in ${server.server_id}, aka ${guildChannel.guild.name}/${guildChannel.name}.`
        );
      }
    } catch (error) {
      Logger.error(
        `Failed to send lunch menu to ${server.channel_id} in ${server.server_id}.`
      );
      console.log(error);
    }
  }
}
