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