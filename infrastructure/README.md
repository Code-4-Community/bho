# Infrastructure

AWS CDK app (TypeScript) that defines the cloud resources as code. It has its own `package.json` and `yarn.lock`, so the root `yarn install` does not install it. Install it from the repo root with `nx run infra:install`, or run `yarn install` inside this folder. 

Requires Node 24 (see `.nvmrc`). 

## Commands

| Command | What it does |
| --- | --- |
| `nx run infra:install` | Install CDK, esbuild and Jest (run from the repo root). Same as `yarn install --frozen-lockfile` in this folder |
| `yarn synth` | Generate the CloudFormation template into `cdk.out/`. Builds nothing in AWS |
| `yarn test` | Run the `Template.fromStack` tests |
| `yarn diff` / `yarn deploy` | Compare or deploy to the configured AWS account |

## Stacks

### `UploadStack` (`lib/upload-stack.ts`)

Receives CSV uploads and triggers the upload Lambda.

```
CSV uploaded -> S3 bucket -> OBJECT_CREATED (*.csv) -> upload Lambda (read-only on the bucket)
```

Because of `RETAIN`, destroying the stack leaves the bucket behind. A later deploy that creates a bucket of the same name will fail until the old bucket is emptied and deleted by hand.

### Note: One Bucket Design Decision

Historical and daily data are both going to be stored in the same s3 bucket. This is because they share the same access permissions. To differentiate them, they can be separated into two folders.