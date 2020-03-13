// https://discordapp.com/api/oauth2/authorize?client_id=687839926250766337&permissions=17825808&scope=bot

const prefix = ';;'
require('dotenv').config()

const Discord = require('discord.js')
const admin = require('firebase-admin')
const client = new Discord.Client()

const x = '❌'
const spy = '🕵️'
const check = '✅'

admin.initializeApp({
  credential: admin.credential.cert({
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: JSON.parse(`"${process.env.FIREBASE_PRIVATE_KEY}"`),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    client_x509_cert_url: process.env.FIREBASE_CERT_URL
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
})

const getSettings = async (guild) => {
  return await admin.firestore().collection('settings').doc(guild.id).get()
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})

client.on('message', async (msg) => {
  if (!msg.content.startsWith(prefix)) return
  const split = msg.content.slice(prefix.length).trim().split(/\s+/g)

  switch (split[0].toLowerCase()) {
    case 'silence': {
      if (!split[1] || !parseInt(split[1])) {
        await msg.channel.send(`${x} Usage: \`${prefix}silence <channel id>\``)
        break
      }

      if (!msg.guild) {
        await msg.channel.send(`${x} Please only use this command in a server`)
        break
      }

      if (!msg.member.hasPermission('MANAGE_CHANNELS')) {
        await msg.channel.send(`${spy} You don't have permission to do that!`)
        break
      }

      const channel = msg.guild.channels.resolve(split[1])
      if (!channel) {
        await msg.channel.send(`${x} That channel doesn't exist`)
        break
      }
      if (!channel.joinable) {
        await msg.channel.send(`${x} I don't have permissions to join that channel`)
        break
      }

      console.log(msg.guild.id, split[1])
      await admin.firestore().collection('settings').doc(msg.guild.id).set({
        channelId: split[1]
      }, { merge: true })
      await msg.channel.send(`${check} Updated this server's silence channel to ${channel.name}`)

      break
    }
  }
})

client.on('voiceStateUpdate', async (oldMember, newMember) => {
  if (newMember.id === client.user.id) return

  const oldChannel = oldMember.channel
  const newChannel = newMember.channel

  if (newChannel) {
    const settings = await getSettings(newChannel.guild)
    if (settings.get('channelId') === newChannel.id && !(newMember.guild.voice && newMember.guild.voice.connection) && newChannel.joinable) {
      await newChannel.join()
      console.log('Joined silent channel')
    }
  }

  if (oldChannel) {
    if (oldMember.guild.voice && oldMember.guild.voice.connection && oldChannel.members.size === 1) {
      await oldMember.guild.voice.connection.disconnect()
      console.log('Left empty channel')
    }
  }
})

const timeouts = {}
client.on('guildMemberSpeaking', (member, speaking) => {
  if (speaking.bitfield && !timeouts[member.id]) {
    console.log('Setting timeout')
    timeouts[member.id] = setTimeout(() => {
      console.log('Disconnecting member')
      delete timeouts[member.id]
      member.voice.setChannel(null)
    }, 500)
  } else if (!speaking.bitfield && timeouts[member.id]) {
    console.log('Clearing timeout')
    clearTimeout(timeouts[member.id])
    delete timeouts[member.id]
    member.voice.setChannel(null)
  }
})

client.login(process.env.BOT_TOKEN)