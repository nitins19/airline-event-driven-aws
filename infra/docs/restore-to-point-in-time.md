# Step-by-Step Guide: Restoring a DynamoDB Table Using PITR and AWS CDK

Step 1: Restore the Table to a specific point in time using the following AWS CLI command. Make sure to enter the date and time in a valid ISO 8601 format:

````markdown
```
aws dynamodb restore-table-to-point-in-time --source-table-name FlightOrderTable --target-table-name FlightOrderTable-1 --restore-date-time 2024-12-07T12:00:00Z
```
````

Note: Some configurations like replicas or stream specifications are not restored automatically and must be manually configured later.

Step 2: We comment the replica and streamspecs as new table dont match the old table structure. Once the base configurations for new table is deployed, we can complete the deployment by adding back the commented features(replica and streamspecification), in step 3
 ensuring the restored table fully matches the original table's configuration.

````markdown
```
const flightEventsTableRestored = new CfnGlobalTable(this, 'FlightOrderEvents-1', {
  keySchema: [
    { attributeName: 'passengerId', keyType: 'HASH' }
  ],
  attributeDefinitions: [
    { attributeName: 'passengerId', attributeType: AttributeType.STRING }
  ],
  tableName: 'FlightOrderTable-1',
  billingMode: BillingMode.PAY_PER_REQUEST,
});
```
````

Import the Restored Table into CDK To manage the restored table with CDK and avoid conflicts (e.g., "table already exists"), use the following command to import the table into your CDK stack:

````markdown
```
cdk import --context ENVIRONMENT=dev "Dev/FlightOrdersTable"
```
````

Detect Configuration Drift Before adding back the commented features, check for any configuration drifts to ensure your stack aligns with the actual AWS resources:

````markdown
```
aws cloudformation describe-stack-resource-drifts --stack-name 'Dev-FlightOrdersTable' --stack-resource-drift-status-filters 'MODIFIED'
```
````

Step 3: Reintroduce Unrestored Properties Once the basic setup is complete.

````markdown
```
const flightEventsTableRestored = new CfnGlobalTable(this, 'FlightOrderEvents-1', {
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
flightEventsTableRestored.applyRemovalPolcy(RemovalPolicy.Retain);
```
````

Step 4: Update References in Other Stacks and making sure all references in other stacks are updated to point to the new table.

````markdown
```
const flightEventsTableOld = new CfnGlobalTable(this, 'FlightOrderEvents', {
      tableName: 'FlightOrderTable',     
    });

this.flightEventsTable = new CfnGlobalTable(this, 'FlightOrderEvents-1', {
      tableName: 'FlightOrderTable-1',     
    });

```
````

Step 3 and 4 can be combined into a single step.

In future, you can remove the old table after everything seems to be working smoothly.
