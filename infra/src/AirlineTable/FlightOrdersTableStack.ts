import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table, BillingMode, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

export interface FlightOrdersTableProps extends StackProps {}

export default class FlightOrdersTable extends Stack {
  readonly flightEventsTable: Table;

  constructor(scope: Construct, id: string, props: FlightOrdersTableProps) {
    super(scope, id, props);

    this.flightEventsTable = new Table(this, 'FlightOrderEvents', {
      partitionKey: { name: 'passengerId', type: AttributeType.STRING },
      stream: StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
  
}
