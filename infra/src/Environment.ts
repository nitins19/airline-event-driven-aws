import { Construct } from 'constructs';
import { Stage, StageProps } from 'aws-cdk-lib';
import FlightOrdersTable from './AirlineTable/FlightOrdersTableStack';
import ServiceStack from './ServiceStack';

export interface EnvironmentProps extends StageProps { }

const US_EAST_1 = 'us-east-1';
const US_WEST_2 = 'us-west-2';

export default class Environment extends Stage {
  constructor(scope: Construct, id: string, props: EnvironmentProps) {
    super(scope, id, props);

    if (props.env?.account && props.env?.region) {
      const stacks = [];
      const replicationRegions = [US_EAST_1];
      replicationRegions.push(US_WEST_2);
      const flightOrdersTableStack = new FlightOrdersTable(this, 'FlightOrdersTable', {
        replicationRegions
      });

      if (!flightOrdersTableStack.flightEventsTable.tableName ) {
        throw new Error("Table name  is undefined");
      }

      
      if (!flightOrdersTableStack.flightEventsTable.attrStreamArn) {
        throw new Error("Table stream ARN is undefined");
      }

      const serviceStack = new ServiceStack(this, 'ServiceStack', {
        flightOrderTableName: flightOrdersTableStack.flightEventsTable.tableName,
        tableStreamARN: flightOrdersTableStack.flightEventsTable.attrStreamArn,
        eventBusName: 'FlightOrderEventsBus'
      });

      stacks.push(flightOrdersTableStack);
      stacks.push(serviceStack);
    } else {
      throw new Error('Expected account and region to be defined in props.env');
    }
  }
}
