const WebSocket = require('ws')
const express = require('express')
const app = express()
const http = require('http')
const httpServer = http.createServer(app)

app.get('/', ( req, res ) => res.send('x'))

httpServer.listen(3000)

const state = {
  chats: {},
  users: {}
}

const server = new WebSocket.Server({ server: httpServer })

server.broadcast = function ( message, sender ) {

  let { event } = JSON.parse(message)

  if (event === 'user.login') {
    sender.send(JSON.stringify({
      event:   'user.login',
      payload: state.chats
    }))
  }

  server.clients.forEach(function ( client ) {
    if (client !== sender) {
      handleIO(client, message)
    }
  })
}

server.on('connection', function connection( io ) {

  io.on('message', function incoming( message ) {
    server.broadcast(message, io)
  })

})

// handler
function handleIO( io, message ) {

  let { event, payload } = JSON.parse(message)

  switch (event) {
    case 'chat.created':
      chatCreated(io, payload)
      break
    case 'user.join':
      userJoinChat(io, payload)
      break
    case 'user.left':
      userLeftChat(io, payload)
      break
    case 'chat.message':
      handleMessage(io, payload)
      break
    case 'connected':
      console.log('connected')
  }
}

function handleMessage( io, payload ) {

  state.chats[ payload.chatId ].messages.push(payload)

  io.send(JSON.stringify({
    event:   'chat.message',
    payload: payload // return message
  }))

}

function chatCreated( io, payload ) {

  const { id } = payload

  state.chats[ id ] = {
    ...payload,
    participants: [],
    messages:     []
  }

  io.send(JSON.stringify({
    event:   'chat.created',
    payload: state.chats[ id ] // return chat
  }))
}

function userJoinChat( io, payload ) {

  const { user, chatId } = payload

  state.chats[ chatId ].participants.push(user)

  io.send(JSON.stringify({
    event:   'user.join',
    payload: state.chats[ chatId ]
  }))
}

function userLeftChat( io, payload ) {

  const { user, chatId } = payload

  state.chats[ chatId ] = {
    ...state.chats[ chatId ],
    participants: [ ...state.chats[ chatId ].participants.filter(p => p !== user) ]
  }

  io.send(JSON.stringify({
    event:   'user.left',
    payload: state.chats[ chatId ]
  }))
}