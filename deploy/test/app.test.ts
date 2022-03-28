import * as cdk from 'aws-cdk-lib';
import { Template, Capture } from 'aws-cdk-lib/assertions';
import * as App from '../lib/app-stack';

// Always run this for a CDK stack. The output defines what properties we can test using assertions and helps us write other tests. Prettify the JSON.
test('Log of generated cloudformation resources we can test', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new App.AppStack(app, 'MyTestStack');
  // THEN

  const template = Template.fromStack(stack);

  console.log(template);
  console.log(JSON.stringify(template));
});


// SEE https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
test('Kinesis Stream and Cloudwatch Alarm Stack', () => {

  // given
  const app = new cdk.App();

  // when
  const stack = new App.AppStack(app, 'MyTestStack');

  // then
  const template = Template.fromStack(stack);

  // Example: normal technique to unit test generated cloudformation resources
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    RetentionPeriodHours: 24
  });

  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Period: 300,
    MetricName: "WriteProvisionedThroughputExceeded",
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    Statistic: "Average",
  });

  template.resourceCountIs('AWS::CloudWatch::Alarm', 1);

  // Example: technique to test a complex text field value
  const cp1 = new Capture();
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    AlarmDescription: cp1
  });
  expect(cp1.asObject()).toEqual(
      {
        "Fn::Join":
            [
              "",
              [
                "Too many WriteProvisionedThroughputExceeded errors in stream: ",
                {
                  "Ref": "rootStream247648A3"
                },
                " detected."
              ]
        ]
      }
  );

});