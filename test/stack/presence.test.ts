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

 import { expect as expectCDK, haveResource, haveOutput, Capture, countResources, haveResourceLike, objectLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Presence from '../../lib/presence-stack';

// Initialize a test stack
const app = new cdk.App();
const stack = new Presence.PresenceStack(app, 'TestStack');

describe('GraphQLAPI and Stack Output', () => {
    // THEN
    test("GraphQL API exists", () => {
      expectCDK(stack).to(haveResource('AWS::AppSync::GraphQLApi'));
    });
    const name = stack.getLogicalId(stack.api.node.defaultChild as cdk.CfnElement);
    test("Output graphQL url", () => {
      expectCDK(stack).to(haveOutput({
        outputName: 'presenceapi',
        exportName: 'presenceEndpoint',
        outputValue: {
          'Fn::GetAtt': [
            name,
            'GraphQLUrl'
          ]
        }
      }));
    });
});

describe("Checking GraphQL schema", () => {
  const definition = Capture.aString();
  const testNoSpaces = (s: string) => () => {
    const expr = s.replace(/\s+/g,'\\s*')
      .replace(/([()\[\]])/g,'\\$1');
    expect(definition.capturedValue).toMatch(new RegExp(expr));
  };
  
  test("Schema inlined", () => {
    expectCDK(stack).to(haveResource('AWS::AppSync::GraphQLSchema', {
      Definition: definition.capture()
    }));
  });

  test("Basic types", testNoSpaces(`schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }`));

  test("Status enum", testNoSpaces(`enum Status {
      online
      offline
    }`));

  test("Presence type", testNoSpaces(`type Presence @aws_iam @aws_api_key {
    id: ID!
    status: Status!
  }`));

  test("Queries", testNoSpaces(`type Query {
    heartbeat(id: ID!): Presence
    status(id: ID!): Presence
  }`));
  
  test("Mutations", testNoSpaces(`type Mutation {
    connect(id: ID!): Presence
    disconnect(id: ID!): Presence
    disconnected(id: ID!): Presence
    @aws_iam
  }`));

  test("Subscriptions", testNoSpaces(`type Subscription {
    onStatus(id: ID!): Presence
    @aws_subscribe(mutations: [\"connect\", \"disconnected\"])
  }`));

});

describe("Lambda functions", () => {
  test("Define 5 lambdas", () => {
    expectCDK(stack).to(countResources("AWS::Lambda::Function", 5));
  });
  test("Checking some lambdas", () => {
    expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
      Handler: "timeout.handler",
      Environment: {
        Variables: objectLike({ TIMEOUT: "10000" }) }
    }));  
  });
});