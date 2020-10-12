# Building a Presence API using Amazon AppSync, AWS Lambda and Amazon Elasticache

When developing a video game, whether it is a single player or multiplayer one, social and competitive features have become  necessary to create a network effect and increase players' engagement. To implement those features, you will usually develop a backend that your players will connect to, and that you'll use to store players' data. To make the best usage of those social features, adding presence information will let players know which of their friends are currently online, to be able to challenge them quickly, or invite them for a game session. They might also want to be updated when those status change.

In this post, I will expose a solution to build a Presence API using [AWS AppSync](https://aws.amazon.com/appsync), [AWS Lambda](https://aws.amazon.com/lambda) and [Amazon Elasticache](https://aws.amazon.com/elasticache).

