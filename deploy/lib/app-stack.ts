import {aws_cloudwatch_actions, CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import { Construct } from 'constructs';

// SEE https://github.com/aws-samples/streaming-solution-aws-cdk/blob/main/lib/streaming-solution-with-cdk-stack.ts
// SEE https://aws.amazon.com/blogs/big-data/build-a-real-time-streaming-analytics-pipeline-with-the-aws-cdk/
// https://bobbyhadz.com/blog/aws-cdk-s3-bucket-example
export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // StackProps can be customised but its just extra hassle configuring tests.
    // Instead set process.env.TELEPHONE_NUMBER via:
    //  export TELEPHONE_NUMBER=+12341234       // export to bash shell & cdk deploy
    //  TELEPHONE_NUMBER?=+12341234             // or Makefile approach setting in Makefile
    const telephoneNumber = process.env.TELEPHONE_NUMBER || '+123412341234';

    const rootStream = new kinesis.Stream(this, 'rootStream', {
      shardCount: 1,
      streamName: 'bkco-kinesis-stream',
    });

    // Monitor the metric and send an alarm given certain conditions
    const metricWriteProvisionedThroughputExceeded = rootStream.metric("WriteProvisionedThroughputExceeded");

    const alarm = new cloudwatch.Alarm(this, 'Alarm-WriteProvisionedThroughputExceeded', {
      metric: metricWriteProvisionedThroughputExceeded,
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'Too many WriteProvisionedThroughputExceeded errors in stream: ' + rootStream.streamName.toString() + ' detected.'
      // alarmDescription: 'Too many invocation errors of the Okta logging forwarder lambda. \
      // Please check the lambda CloudWatch logs for error. \
      //     Can also reach out to OperabilityReliability team. \
      //     okta-logging ${opsgeniePriority} oncall:false'
    });

    const topic = new sns.Topic(this, 'sns-kinesis-alarm-topic', {
      displayName: 'my-sns-kinesis-alarm-topic',
    });

    topic.addSubscription(new subs.SmsSubscription(telephoneNumber));

    alarm.addAlarmAction(new aws_cloudwatch_actions.SnsAction(topic));

    // S3 bucket that will serve as the destination for our raw compressed data
    const rawDataBucket = new s3.Bucket(this, "RawDataBucket");

    const firehoseRole = new iam.Role(this, 'firehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com')
    });

    rootStream.grantRead(firehoseRole);
    rootStream.grant(firehoseRole, 'kinesis:DescribeStream');
    rawDataBucket.grantWrite(firehoseRole);

    const firehoseStreamToS3 = new kinesisfirehose.CfnDeliveryStream(this, "FirehoseStreamToS3", {
      deliveryStreamName: "StreamRawToS3",
      deliveryStreamType: "KinesisStreamAsSource",
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: rootStream.streamArn,
        roleArn: firehoseRole.roleArn
      },
      s3DestinationConfiguration: {
        bucketArn: rawDataBucket.bucketArn,
        bufferingHints: {
          sizeInMBs: 64,
          intervalInSeconds: 60
        },
        compressionFormat: "GZIP",
        encryptionConfiguration: {
          noEncryptionConfig: "NoEncryption"
        },

        prefix: "raw/",
        roleArn: firehoseRole.roleArn
      },
    });

    // Ensures our role is created before we try to create a Kinesis Firehose
    firehoseStreamToS3.node.addDependency(firehoseRole);

    new CfnOutput(this, 'snsTopicArn', {
      value: topic.topicArn,
      description: 'The arn of the SNS topic',
    })
  }
}
