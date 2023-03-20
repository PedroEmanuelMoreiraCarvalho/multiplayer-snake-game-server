import { io } from "../server";

const FPS: number = 500; //one half second
const map_size = 100;

interface game_data_type {
    fruits: Fruit[],
    players: object_player[]
}

interface object_player {
    id: String,
    nick: String,
    color: String,
    snake: (Head|Segment)[];
};

class Fruit{
    x: number;
    y: number;

    constructor(){
        this.x = Math.floor(Math.random()*(map_size-1));
        this.y = Math.floor(Math.random()*(map_size-1));
    };
};

class Segment{
    x: number;
    y: number;
    parent: Segment | Head;

    constructor(x: number, y: number, parent: Segment| Head){
        this.x = x;
        this.y = y;
        this.parent = parent;
    }

    tick(){
        this.x = this.parent.x;
        this.y = this.parent.y;
    }
};

class Head{
    x: number;
    y: number;
    direction: "up" | "right" | "left" | "down";
    new_direction: "up" | "right" | "left" | "down";

    constructor(){
        this.x = Math.floor(Math.random()*10);
        this.y = Math.floor(Math.random()*10);
        this.direction = "right";
        this.new_direction = "right"
    }

    redirect(new_direction: "up" | "right" | "left" | "down"){
        this.new_direction = new_direction;
    };

    getX(): number{
        return this.x;
    };

    getY(): number{
        return this.y;
    };

    tick(){
        this.direction = this.new_direction;
        switch(this.direction){
            case "up":
                this.y--;
                break;
            case "right":
                this.x++;
                break
            case "left":
                this.x--;
                break;
            case "down":
                this.y++;
                break;
        };

        if(this.x >= map_size){
            this.x = 0;
        }else if(this.x < 0){
            this.x = map_size-1;
        };

        if(this.y > map_size){
            this.y = 0;
        }else if(this.y < 0){
            this.y = map_size-1;
        };
        
    };
};

function generateColor():string{
    let caracters: string[] = ["0","1","2","3","4","5","6","7","8","9","10","A","B","C","D","E","F"];
    let color: string = "#";
    for(let i=0; i<3;i++){
        let random_index = Math.floor(Math.random() * caracters.length);
        let new_car = caracters[random_index];
        color = color + new_car;
        caracters = caracters.filter((car)=>{
            return car != new_car;
        });
    }
    return color;
}

class Player{
    player_id: string;
    nick: string;
    color: string;
    head: Head;
    snake: (Head| Segment)[];

    constructor(player_id: string, nick: string){
        this.player_id = player_id;
        this.nick = nick;
        this.color = generateColor();
        this.head = new Head();
        this.snake = [this.head, new Segment(this.head.getX(),this.head.getY(),this.head)];
    }

    tick(){
        for(let i = this.snake.length-1; i >= 0; i--){
            let segment: Head | Segment = this.snake[i];
            segment.tick();
        };
    };

    up(){
        if(this.head.direction !== "down"){
            this.head.redirect("up");
        }
    };

    right(){
        if(this.head.direction !== "left"){
            this.head.redirect("right");
        }
    };

    left(){
        if(this.head.direction !== "right"){
            this.head.redirect("left");
        }
    };

    down(){
        if(this.head.direction !== "up"){
            this.head.redirect("down");
        }
    };
    
    grow(){
        let last_segment = this.snake[this.snake.length - 1];
        let new_segment = new Segment(last_segment.x, last_segment.y, last_segment);
        this.snake.push(new_segment);
    }

};

class Game{
    room_id: string;
    players: Player[];
    fruits: Fruit[];

    constructor(room_id: string){
        this.room_id = room_id;
        this.players = [];
        this.fruits = [];
    };

    createFruit(){
        this.fruits.push(new Fruit());
    };

    detectFruitColision(player: Player){
        this.fruits.forEach((fruit)=>{
            if(player.head.getX() == fruit.x && player.head.getY() == fruit.y){
                player.grow();
                this.fruits = this.fruits.filter((fruit_)=>{
                    return fruit_ != fruit;
                });
            }
        });
    };

    remove(player_id: String){
        this.players = this.players.filter((player_)=>{
            return player_.player_id != player_id;
        });
    };

    detectPlayerCollisionWithPlayers(player: Player){
        this.players.forEach((player_in_game)=>{
            if(player_in_game.player_id == player.player_id){
                return;
            }
            player_in_game.snake.forEach((segment)=>{
                if(player.head.getX() == segment.x && player.head.getY() == segment.y){
                    this.remove(player.player_id);
                    return;
                }
            });
        });
    }

    detectPLayerColisionWithItself(player: Player){
        player.snake.forEach((segment)=>{
            if(segment instanceof Head)return;
            if(player.head.getX() == segment.x && player.head.getY() == segment.y){
                this.remove(player.player_id);
                return;
            }
        })
    };

    sendGameData(){
        let game_data: game_data_type = {
            fruits: this.fruits,
            players: []
        };

        this.players.forEach((player)=>{
            let player_obj: object_player = {
                id: player.player_id,
                nick: player.nick,
                color: player.color,
                snake: player.snake,
            };
            game_data.players.push(player_obj);
        });

        io.to(this.room_id).emit("game_data", game_data);
    };

    tick(){
        setInterval(()=>{
            this.players.forEach((player)=>{
                player.tick();
                this.detectFruitColision(player);
                this.detectPlayerCollisionWithPlayers(player);
                this.detectPLayerColisionWithItself(player);
                this.sendGameData();
            });
            this.createFruit();
        },FPS);
    };

    addPlayer(player_id: string, nick: string){
        this.players.push(new Player(player_id, nick));
    };

    getPlayer(id: string){
        let actualy_player = this.players.filter((player)=>{
            return player.player_id === id;
        }).shift();

        return actualy_player;
    }
}

function newGame(room_id: string): Game{
    let game = new Game(room_id);
    return game;
};

export { Game, newGame };