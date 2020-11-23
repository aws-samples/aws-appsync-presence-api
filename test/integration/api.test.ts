
import PresenceApi from "./apiclient";

describe("API Integration test", () => {
  const api = new PresenceApi();
  test("Check stack output", () => {
    expect(PresenceApi.getConfig()).toMatchObject({
      "PresenceStack": {
        "presenceapi": expect.stringMatching(/https:.*\/graphql/),
        "apikey": expect.stringMatching(/.*/)
      }
    });
  });      
    
  describe("Simple API Calls", () => {
    test('Query status', async () => {
      const result = await api.status("test");
      expect(result).toMatchObject({
        id: "test", status: "offline"
      });
    });

    test('Connect and online', async () => {
      const connection = await api.connect("connect");
      expect(connection).toMatchObject({
        id: "connect", status: "online"
      });
      const presence = await api.status("connect");
      expect(presence).toMatchObject({
        id: "connect", status: "online"
      });
    });

    test('Disconnect and offline', async () => {
      const disconnection = await api.disconnect("connect");
      expect(disconnection).toMatchObject({
        id: "connect", status: "offline"
      });
      const presence : object = await api.status("connect");
      expect(presence).toMatchObject({
        id: "connect", status: "offline"
      });
    });

    test('Hearbeat and online too', async () => {
      const heartbeat : object = await api.heartbeat("heartbeat");
      expect(heartbeat).toMatchObject({
        id: "heartbeat", status: "online"
      });
      const presence = await api.status("heartbeat");
      expect(presence).toMatchObject({
        id: "heartbeat", status: "online"
      });
    });
  });

  describe("Notifications tests", () => {
    const delayTime = 800; // Use delay to receive notifications
    const observePlayer1 = jest.fn( (data) => data );
    const observePlayer2 = jest.fn( (data) => data );
    const delay = () => new Promise( (resolve, reject) => { setTimeout(resolve, delayTime) } );
    const api = new PresenceApi();
    const player1Sub = api.notify("player1").subscribe({
      next: (notification) => {
        expect(notification).toHaveProperty("data");
        observePlayer1(notification.data);
      }
    });
    const player2Sub = api.notify("player2").subscribe({
      next: (notification) => {
        expect(notification).toHaveProperty("data");
        observePlayer2(notification.data);
      }
    });
  
    test("Connect notification", async () => {
      await api.connect("player1").then(delay).then(()=>{
      expect(observePlayer1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onStatus: expect.objectContaining({
            id: "player1",
            status: "online"
          })
        })
      );
      });
    });
  
    test("Disconnect notification", async () => {
      await api.disconnect("player1").then(delay);
      expect(observePlayer1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onStatus: expect.objectContaining({
            id: "player1",
            status: "offline"
          })
        })
      );
    });
  
    test("Second player notification", async () => {
      await api.connect("player2").then(delay);
      //expect(observePlayer1).toHaveBeenCalledTimes(2);
      expect(observePlayer2).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onStatus: expect.objectContaining({
            id: "player2",
            status: "online"
          })
        })
      );
    });
    
    afterAll(()=>{
      player1Sub.unsubscribe();
      player2Sub.unsubscribe();
    });
  
  });

});