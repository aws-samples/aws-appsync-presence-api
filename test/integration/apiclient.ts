/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
class Api {
  private static _client : AWSAppSync.AWSAppSyncClient<any>;
  private static _stackOutput = require("../../presence.json");
  private static initClient() : AWSAppSync.AWSAppSyncClient<any> {
    const config : AWSAppSync.AWSAppSyncClientOptions = {
      url: Api._stackOutput.PresenceStack.presenceapi,
      region: Api._stackOutput.PresenceStack.region,
      auth: {
        type: AWSAppSync.AUTH_TYPE.API_KEY,
        apiKey: Api._stackOutput.PresenceStack.apikey
      },
      disableOffline: true
    };
    return new AWSAppSync.AWSAppSyncClient(config);
  }

  constructor() {
    if (!Api._client) Api._client = Api.initClient();
  }

  static getConfig() {
    return this._stackOutput;
  }

  private _extract(field : string) : any {
    return (result: {[f:string]:any}) : any => {
      const { __typename, ...data } = result.data[field];
      return data;
    }
  }

  private async _mutate(id: string, gqlQuery: any, ret: string) {
    return Api._client.mutate({
      mutation: gqlQuery,
      variables: { id }
    }).then( this._extract(ret) );
  }

  private async _query(id: string, gqlQuery: any, ret: string) {
    return Api._client.query({
      query: gqlQuery,
      variables: { id }
    }).then( this._extract(ret) );
  }

  async connect(id: string) {
    return this._mutate(id, connectPlayer, "connect");
  };

  async disconnect(id: string) {
    return this._mutate(id, disconnectPlayer, "disconnect");
  };

  async status(id: string) {
    return this._query(id, getStatus, "status");
  };

  async heartbeat(id: string) {
    return this._query(id, sendHeartbeat, "heartbeat");
  }

  notify(id: string) {
    return Api._client.subscribe({
      query: onChangeStatus,
      variables: { id }
    });
  };
};

export default Api;