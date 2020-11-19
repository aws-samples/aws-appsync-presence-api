
require('isomorphic-fetch'); // Required for 'aws-appsync'
import * as AWSAppSync from "aws-appsync";
import gql from "graphql-tag";

// Prepare all queries
const presenceResult = `{
  id
  status
}`;
const getStatus = gql`
  query getStatus($id: ID!) {
    status(id: $id) ${presenceResult}
  }
`;
const sendHeartbeat = gql`
  query heartbeat($id: ID!) {
    heartbeat(id: $id) ${presenceResult}
  }
`
const connectPlayer = gql`
  mutation connectPlayer($id: ID!) {
    connect(id: $id) ${presenceResult}
  }
`
const disconnectPlayer = gql`
  mutation disconnectPlayer($id: ID!) {
    disconnect(id: $id) ${presenceResult}
  }
`
const onChangeStatus = gql`
  subscription statusChanged($id: ID!) {
    onStatus(id: $id) ${presenceResult}
  }
`

// Client creation
const stackOutput = require("../../presence.json");
const getApiClient = () => {
  {
    const config : AWSAppSync.AWSAppSyncClientOptions = {
      url: stackOutput.PresenceStack.presenceapi,
      region: stackOutput.PresenceStack.region,
      auth: {
        type: AWSAppSync.AUTH_TYPE.API_KEY,
        apiKey: stackOutput.PresenceStack.apikey
      },
      disableOffline: true
    };
    return new AWSAppSync.AWSAppSyncClient(config);
  }
};

describe("API Integration test", () => {
  describe("Task output file", () => {
    test("Check stack output", () => {
      expect(stackOutput).toMatchObject({
        "PresenceStack": {
          "presenceapi": expect.stringMatching(/https:.*\/graphql/),
          "apikey": expect.stringMatching(/.*/)
        }
      });
    });
  });

  describe("GraphQL API tests", () => {
    let client : AWSAppSync.AWSAppSyncClient<any>;
    
    beforeAll(()=> { client = getApiClient() });

    describe("Query & mutations test", () => {
      test('Query status', async () => {
        const result : object = await client.query({
          query: getStatus,
          variables: {id: "test"}
        });
        expect(result).toHaveProperty("data.status", {
          id: "test", status: "offline", "__typename" : "Presence"
        });
      });
  
      test('Connect and online', async () => {
        const connection : object = await client.mutate({
          mutation: connectPlayer,
          variables: {id: "connect"}
        });
        expect(connection).toHaveProperty("data.connect", {
          id: "connect", status: "online", "__typename" : "Presence"
        });
        const presence : object = await client.query({
          query: getStatus,
          variables: {id: "connect"}
        });
        expect(presence).toHaveProperty("data.status", {
          id: "connect", status: "online", "__typename" : "Presence"
        });
      });
  
      test('Disconnect and offline', async () => {
        const disconnection : object = await client.mutate({
          mutation: disconnectPlayer,
          variables: {id: "connect"}
        });
        expect(disconnection).toHaveProperty("data.disconnect", {
          id: "connect", status: "offline", "__typename" : "Presence"
        });
        const presence : object = await client.query({
          query: getStatus,
          variables: {id: "connect"}
        });
        expect(presence).toHaveProperty("data.status", {
          id: "connect", status: "offline", "__typename" : "Presence"
        });
      });
  
      test('Hearbeat and online too', async () => {
        const heartbeat : object = await client.query({
          query: sendHeartbeat,
          variables: {id: "heartbeat"}
        });
        expect(heartbeat).toHaveProperty("data.heartbeat", {
          id: "heartbeat", status: "online", "__typename" : "Presence"
        });
        const presence : object = await client.query({
          query: getStatus,
          variables: {id: "heartbeat"}
        });
        expect(presence).toHaveProperty("data.status", {
          id: "heartbeat", status: "online", "__typename" : "Presence"
        });
      });
    });

    describe("subscriptions test", () => {
      // Mock functions to receive subscriptons
      const observerPlayer1 = jest.fn( (data) => data );
      const observerPlayer2 = jest.fn( (data) => data );
      const catchError = jest.fn( (err) => err );

      const createSubscription = (id : String, next: (v:any) => void, error: (err:Error) => void) : Observable<any> => {
        return client.subscribe({
          query: onChangeStatus,
          variables: { id }
        });
      };

      let subscriptionPlayer1 : ZenObservable.Subscription;
      let subscriptionPlayer2 : ZenObservable.Subscription;
      beforeAll(() => {
        subscriptionPlayer1 = createSubscription("player1", observerPlayer1, catchError );
        subscriptionPlayer2 = createSubscription("player2", observerPlayer2, catchError );
      });

      test("Connect mutation notification", (done) => {
        client.mutate({
          mutation: connectPlayer,
          variables: {id: "player1"}
        }).then(data => {
          try {
            expect(observerPlayer1).toHaveBeenCalled();
            expect(observerPlayer2).not.toHaveBeenCalled();
            expect(data).toHaveProperty("data.onStatus", {
              id: "player1", status: "online", "__typename" : "Presence"
            });
            done();
          } catch (error) {
            done(error);
          } 
        });
      });

      afterAll(() => {
        subscriptionPlayer1.unsubscribe();
        subscriptionPlayer2.unsubscribe();
      });

    });
    
  });
  
});