import parser from "socket.io-msgpack-parser";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import ws from "ws";
import { Game, newGame } from "./src/game";

const httpServer = createServer();
const SOCKET_PORT: string | undefined = process.env.SOCKET_PORT || "8080";

const options = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    wsEngine: ws.Server,
    parser
};

const io = new Server(httpServer,options);

let rooms: Room[] = [];

export class Room {
  id: string;
  sockets: Socket[];
  game: Game;

  constructor(id: string){
    this.id = id;
    this.sockets = [];
    this.game = newGame(id);
  }

  GameTick(){
    this.game.tick();
  }

  getGame(): Game{
    return this.game;
  }

  addSocket(socket: Socket, nick: string){
    this.sockets.push(socket);
    socket.join(this.id);
    this.game.addPlayer(socket.id, nick);
    this.GameTick();
  }

  getPlayers(){
    return this.sockets
  }

  emit(data: any){
    io.to(this.id).emit(data);
  }
}

function createRoom(room_id: string): Room {
  return new Room(room_id);
};

function removeRoom(room_id: String){
  rooms = rooms.filter((room)=>{
      return room.id != room.id;
  });
};

function getRoom(room_id: string): Room{
  let room: Room = new Room("");

  rooms.forEach((room_)=>{
    if(room_.id === room_id){
      room = room_;
    }
  });

  return room;
}

const EventListener: any = {
  up(socket: Socket, room_id: string){
    getRoom(room_id).game.getPlayer(socket.id)?.up();
  },

  right(socket: Socket, room_id: string){
    getRoom(room_id).game.getPlayer(socket.id)?.right();
  },

  left(socket: Socket, room_id: string){
    getRoom(room_id).game.getPlayer(socket.id)?.left();
  },

  down(socket: Socket, room_id: string){
    getRoom(room_id).game.getPlayer(socket.id)?.down();
  },

  diconnect(socket: Socket, room_id: string){
    getRoom(room_id).game.remove(socket.id);
  },

  enterRoom(socket: Socket, room_and_nick: { room: string, nick: string}){
    if(getRoom(room_and_nick.room).id === ""){
      io.to(socket.id).emit("ServerMessage","Room doesn't exists");
      return;
    };
    
    socket.join(room_and_nick.room);
    let actualy_room = getRoom(room_and_nick.room);
    actualy_room.addSocket(socket, room_and_nick.nick);

    io.to(socket.id).emit("ServerMessage","Ready");
  },

  createRoom(socket: Socket, room_and_nick: { room: string, nick: string}){
    if(getRoom(room_and_nick.room).id !== ""){
      io.to(socket.id).emit("ServerMessage","Room already exists");
      return;
    };
    
    socket.join(room_and_nick.room);
    let new_room = createRoom(room_and_nick.room);
    new_room.addSocket(socket, room_and_nick.nick);
    rooms.push(new_room);

    io.to(socket.id).emit("ServerMessage","Ready");
  }
};

io.on("connection", (socket: Socket) => {
  socket.prependAny((eventName, args) => {
        const eventFunction: any = EventListener[eventName];
        if(!eventFunction) return;
        eventFunction(socket,args);
    });
});

httpServer.listen(SOCKET_PORT);

export { io }