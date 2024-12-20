import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, BillingMode, StreamViewType, CfnGlobalTable } from 'aws-cdk-lib/aws-dynamodb';

export interface FlightOrdersTableProps extends StackProps {
  readonly replicationRegions: string[];
}

export default class FlightOrdersTable extends Stack {
  readonly flightEventsTable: CfnGlobalTable;

  constructor(scope: Construct, id: string, props: FlightOrdersTableProps) {
    super(scope, id, props);

    const flighteventReplicas: Array<CfnGlobalTable.ReplicaSpecificationProperty> = props.replicationRegions.map((region) => {
      return {
        region,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }
      }
    });

    this.flightEventsTable = new CfnGlobalTable(this, 'FlightOrderEvents-1', {
      keySchema: [
        { attributeName: 'passengerId', keyType: 'HASH' }
      ],
      attributeDefinitions: [
        { attributeName: 'passengerId', attributeType: AttributeType.STRING }
      ],
      replicas: flighteventReplicas,
      tableName: 'FlightOrderTable-1',
      streamSpecification: { streamViewType: StreamViewType.NEW_AND_OLD_IMAGES },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    this.flightEventsTable.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const flightEventsTableRestored = new CfnGlobalTable(this, 'FlightOrderEvents-2', {
      keySchema: [
        { attributeName: 'passengerId', keyType: 'HASH' }
      ],
      attributeDefinitions: [
        { attributeName: 'passengerId', attributeType: AttributeType.STRING }
      ],
      // replicas: flighteventReplicas,
      replicas: [{
        region: "us-east-1"
      }],
      tableName: 'FlightOrderTable-2',
      // streamSpecification: { streamViewType: StreamViewType.NEW_AND_OLD_IMAGES },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

  }

}
