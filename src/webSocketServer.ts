import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

export class WebSocketServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private users: Map<string, any>;

  constructor(app: express.Application) {
    this.app = app;
    this.users = new Map();

    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
      },
    });

    instrument(this.io, {
      auth: false,
      namespaceName: "/",
    });

    this.initializeRoutes();
    this.initializeSocketEvents();
  }

  private initializeRoutes(): void {
    this.app.get("/", (req, res) => {
      res.render("home");
    });

    this.app.get("/*", (req, res) => {
      res.redirect("/");
    });
  }

  private initializeSocketEvents(): void {
    this.io.on("connection", (socket) => {
      socket.on("disconnect", () => {
        if (socket.data.chatRoom) {
          if (this.getRooms().includes(socket.data.chatRoom)) {
            const user = this.users.get(socket.data.userId);

            if (user) {
              this.io.sockets.to(socket.data.chatRoom).emit("notify-leave-room", {
                id: user.id,
                nickname: user.nickname,
                sizeOfRoom: this.getSizeOfRoom(socket.data.chatRoom),
              });
            }
          } else {
            this.io.sockets.emit("refresh-rooms", this.getRooms());
          }
        }
      });

      socket.on("login", (id, password, done) => {
        let user;

        if (this.users.has(id) && this.users.get(id).password === password) {
          user = this.users.get(id);
        } else {
          user = this.createUser(this.getRandomString(), this.getRandomString());
          this.users.set(user.id, user);
        }

        socket.data.userId = user.id;
        done({
          id: user.id,
          password: user.password,
          nickname: user.nickname,
        });
      });

      socket.on("get-rooms", (done) => {
        done(this.getRooms());
      });

      socket.on("join-room", (_chatRoom, done) => {
        const user = this.users.get(socket.data.userId);
        const chatRoom = _chatRoom.trim().toUpperCase();

        if (user && chatRoom && !socket.data.chatRoom) {
          const isNewRoom = !this.getRooms().includes(chatRoom);

          socket.join(chatRoom);
          socket.to(chatRoom).emit("notify-join-room", {
            id: user.id,
            nickname: user.nickname,
            sizeOfRoom: this.getSizeOfRoom(chatRoom),
          });

          if (isNewRoom) {
            this.io.sockets.emit("refresh-rooms", this.getRooms());
          }

          socket.data.chatRoom = chatRoom;
          done({
            chatRoom,
            sizeOfRoom: this.getSizeOfRoom(chatRoom),
          });
        }
      });

      socket.on("leave-room", (done) => {
        const user = this.users.get(socket.data.userId);

        if (user && socket.data.chatRoom) {
          socket.leave(socket.data.chatRoom);

          const isRoomRemoved = !this.getRooms().includes(socket.data.chatRoom);

          if (isRoomRemoved) {
            this.io.sockets.emit("refresh-rooms", this.getRooms());
          } else {
            this.io.sockets.to(socket.data.chatRoom).emit("notify-leave-room", {
              id: user.id,
              nickname: user.nickname,
              sizeOfRoom: this.getSizeOfRoom(socket.data.chatRoom),
            });
          }

          socket.data.chatRoom = undefined;
          done();
        }
      });

      socket.on("change-nickname", (_nickname, done) => {
        const user = this.users.get(socket.data.userId);
        const nickname = _nickname.trim();

        if (!user || !nickname || user.nickname === nickname) {
          return;
        }

        const oldNickname = user.nickname;
        user.nickname = nickname;

        if (socket.data.chatRoom) {
          socket.to(socket.data.chatRoom).emit("notify-change-nickname", {
            id: user.id,
            nickname: user.nickname,
            oldNickname,
          });
        }

        done();
      });

      socket.on("webrtc-offer", async (userId, offer) => {
        const user = this.users.get(socket.data.userId);
        const targetSocket = (await this.io.fetchSockets()).find(
          (aSocket) => (aSocket.data.userId === userId),
        );

        if (user && targetSocket) {
          socket.to(targetSocket.id).emit("webrtc-offer", socket.data.userId, user.nickname, offer);
        }
      });

      socket.on("webrtc-answer", async (userId, answer) => {
        const user = this.users.get(socket.data.userId);
        const targetSocket = (await this.io.fetchSockets()).find(
          (aSocket) => (aSocket.data.userId === userId),
        );

        if (user && targetSocket) {
          socket.to(targetSocket.id).emit("webrtc-answer", socket.data.userId, user.nickname, answer);
        }
      });

      socket.on("webrtc-ice-candidate", async (userId, iceCandidate) => {
        const user = this.users.get(socket.data.userId);
        const targetSocket = (await this.io.fetchSockets()).find(
          (aSocket) => (aSocket.data.userId === userId),
        );

        if (user && targetSocket) {
          socket.to(targetSocket.id).emit("webrtc-ice-candidate", socket.data.userId, iceCandidate);
        }
      });
      //chatting
      socket.on("send_roomId", (data) => {
        this.io.to(data.roomId).emit("send_roomId", data);
      });

      socket.on("enter_room", async (roomId) => {
        try {
          const sortedId = roomId.split('').sort().join('');
          socket.join(sortedId);
        } catch (err) {
          console.error(err);
        }
      });

      socket.on("new_message", (msg, roomId, sender, done) => {
        const sortedId = roomId.split('').sort().join('');
        socket.to(sortedId).emit("new_message", msg, sender);
        done();
      });
    });

    
  }

  private getRooms(includeSids?: boolean): string[] {
    return Array.from(this.io.sockets.adapter.rooms.keys())
      .filter((roomName) => includeSids || !this.io.sockets.adapter.sids.has(roomName));
  }

  private getSizeOfRoom(roomName: string): number {
    return this.io.sockets.adapter.rooms.get(roomName)?.size || 0;
  }

  private createUser(id: string, password: string) {
    return {
      id,
      password,
      nickname: "Anonymous",
    };
  }

  private getRandomString(): string {
    return Math.random().toString(16).slice(2);
  }

  public listen(port: number): void {
    this.server.listen(port, () => {
      console.log(`Listening on port ${port}...`);
    });
  }
}

export default WebSocketServer;