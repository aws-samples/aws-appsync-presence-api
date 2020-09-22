import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elasticache from '@aws-cdk/aws-elasticache';

export class PresenceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Network: one VPC and subnet  
     **/
    const vpc = new ec2.Vpc(this, 'PresenceVPC', {
      cidr: "10.42.0.0/16",
      subnetConfiguration: [
        // Subnet group for Redis
        {
          cidrMask: 24,
          name: "Redis",
          subnetType: ec2.SubnetType.ISOLATED
        },
        // Subnet group for Lambda
        {
          cidrMask: 24,
          name: "Lambda",
          subnetType: ec2.SubnetType.ISOLATED
        }
      ]
    });

    /**
     * Redis cache cluster
     * Uses T3 small instances to start withs
     */
    // The Cluster requires a SubnetGroup:
    const redisSubnets = new elasticache.CfnSubnetGroup(this, "RedisSubnets", {
      cacheSubnetGroupName: "RedisSubnets",
      description: "Subnet Group for Redis Cluster",
      subnetIds: vpc.selectSubnets({ subnetGroupName: "Redis"}).subnetIds
    });
    const redisCluster = new elasticache.CfnCacheCluster(this, "PresenceCluster", {
      cacheNodeType: "cache.t3.small",
      engine: "redis",
      numCacheNodes: 1,
      azMode: "single-az",
      cacheSubnetGroupName: redisSubnets.cacheSubnetGroupName
    });
    

  }
}
