require("dotenv").config();
const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const { YTSearcher } = require("ytsearcher");

const client = new Discord.Client();
const searcher = new YTSearcher({
  key: process.env.YT_KEY,
  revealed: true,
});
const queue = new Map();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (message) => {
  const star = "*";
  const serverQueue = queue.get(message.guild.id);
  const args = message.content.slice(star.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const song = message.content.slice(
    command.length + 2,
    message.content.length
  );

  switch (command) {
    case "play":
      execute(message, serverQueue);
      break;
    case "stop":
      stop(message, serverQueue);
      break;
    case "skip":
      skip(message, serverQueue);
      break;
    case "help":
      help(message);
      break;
  }

  async function execute(message, serverQueue) {
    let vc = message.member.voice.channel;
    if (!vc) {
      return message.channel.send("Bir ses kanalına girmelisin!");
    } else {
      let result = await searcher.search(song, { type: "video" });

      const songInfo = await ytdl.getInfo(result.first.url);

      let songFeatures = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      };
      if (!serverQueue) {
        const queueConstructor = {
          txtChannel: message.channel,
          vChannel: vc,
          connection: null,
          songs: [],
          volume: 10,
          playing: true,
        };
        queue.set(message.guild.id, queueConstructor);
        queueConstructor.songs.push(songFeatures);

        try {
          let connection = await vc.join();
          queueConstructor.connection = connection;
          play(message.guild, queueConstructor.songs[0]);
        } catch (err) {
          console.error(err);
          queue.delete(message.guild.id);
          return message.channel.send("Sesli odaya bağlanılamadı.");
        }
      } else {
        serverQueue.songs.push(songFeatures);
        return message.channel.send(
          `${songFeatures.title} şarkısı listeye eklendi!`
        );
      }
    }
  }
  function play(guild, songFeatures) {
    const serverQueue = queue.get(guild.id);
    if (!songFeatures) {
      serverQueue.vChannel.leave();
      queue.delete(guild.id);
      return;
    }
    message.channel.send(songFeatures.url);
    const dispatcher = serverQueue.connection
      .play(ytdl(songFeatures.url))
      .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      });
  }
  function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
      return message.channel.send("Bir ses kanalına girmelisin!");
    }
    if (serverQueue === undefined) {
      return message.channel.send("Boş listeyi durduramazsın!");
    }
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }
  function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
      return message.channel.send("Bir ses kanalına girmelisin!");
    }
    if (!serverQueue) {
      return message.channel.send("Sırada başka bir şarkı yok!");
    }
    serverQueue.connection.dispatcher.end();
    message.channel.send(result.first.url);
  }
  function help(message) {
    if (!message) {
      return message.channel.send("Yardım bölümünde hata oluştu.");
    }
    const helpmessage = new Discord.MessageEmbed()
      .setTitle("AURMUSIC BOT KOMUTLARI")
      .setDescription(
        "*play: Listeye şarkı ekleme \n *skip: Listedeki sıradaki şarkıya geçme \n *stop: Listeyi durdurma"
      );

    message.channel.send(helpmessage);
  }
});

client.login(process.env.BOT_TOKEN);
