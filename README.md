# Presence API using Amazon AppSync, AWS Lambda, Amazon Elasticache and EventBridge

## Prerequisites
This repository contains code to deploy a Presence API using Amazon AppSync, AWS Lambda, Amazon Elasticache and Amazon EventBridge.
To use it, you will need an [AWS Account](https://aws.amazon.com/free/), as well as AWS credentials properly setup to access your account resources from the code (see ["Configuring the AWS CLI"](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)).


## Installation
The infrastructure is defined using [AWS Cloud Development Kit](https://aws.amazon.com/cdk/). You might need to install it globally if you do not have it yet:
`npm install -g aws-cdk`
To use the repository you can fork it or `git clone` it locally. Once you have the repository, you will have to install the require packages in the different directories:   

```bash
$ npm install
$ cd src/layer/nodejs && npm install
$ cd ../../functions/on_disconnect && npm install
```
> The AWS Cloud Development Kit is currently still being updated frequently, and new versions sometimes introduce breaking changes. The last version tested for this repository is `1.68.0`.

Along with the typescript `npm run build` and `npm run watch` commands (see: [Working with the AWS CDK in TypeScript](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html)), the npm package comes with a few additional commands :
- `npm run deploy`: launches the build command (typescript transpilation) followed by the `cdk deploy` command.
- `npm run test-stack`: build and launches the stack unit tests
- `npm run test-fn`: build and launches the lambda function unit tests
- `npm run test-api`: build and launches the api integration tests

See below for more information on the unit tests.

## Architecture
Here is the architecture deployed by the CDK scripts:

![Architecture](blogpost/images/Presence_API_Events.png)

There are two different scripts to build the stack in the `lib` folder:
- `schema.ts` describes the GraphQl schema as code first
- `presence-stack.ts` describes the main stack, including the previous schema

Use either `npm run deploy` or `cdk deploy` to deploy the infrastructure in your account. The second command assumes you have built the typescript files before running it.

## Tests
There are some tests available in the `/test` subfolder, mostly given out as example. They are not intented for full coverage of the code. They are build using the [Jest](https://jestjs.io/en/) framework. This subfolder also contains a `mock` to gather simple mocking implementations of some AWS services (such as AppSync) used for unit tests. The three type of tests are:
- **stack**: test the stack output from the CDK commands.
- **functions**: unit tests to test the lambda functions handler mainly.
- **integration**: integration tests that can be run against a test or staging environment