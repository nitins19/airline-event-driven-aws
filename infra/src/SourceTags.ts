import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';

export interface SourceTagsProps {
    repoUrl: string;
}

export default class SourceTags {
    static add(scope: Construct, props: SourceTagsProps) {

        Tags.of(scope).add('owner', 'nitins19');
        Tags.of(scope).add('id', '2343657');
    }
}
