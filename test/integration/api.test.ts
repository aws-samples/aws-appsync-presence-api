import AppSyncClient from "../mocks/aws-appsync";

require('isomorphic-fetch'); // Required for 'aws-appsync'
import * as AWS from 'aws-sdk/global';
import * as AppSync from 'aws-appsync';

describe("API Integration test", () => {
  const stackOutput = require("../../presence.json");

  describe("Task output file", () => {
    test("Check stack output", () => {
      expect(stackOutput).toMatchObject({
        "PresenceStack": {
          "presenceapi": expect.stringMatching(/https:.*\/graphql/)
        }
      });
    });
  });

  describe("GraphQL API tests", ()=>{
    const AppSyncClient = AppSync.default;
    let gqlClient : AppSyncClient;
    beforeAll(()=>{
      const config = {
        url: stackOutput.PresenceStack.presenceapi,
        region: process.env.AWS_REGION,
        auth: {
          type: AppSync.AUTH_TYPE,
          credentials: AWS.config.credentials
        },
        disableOffline: true
      };
      gqlClient = new AppSyncClient(config);
    });
  });
  
});