# Optional Foundry integration

Foundry is not required for the Skill Loom Foundry API or local development.
The core adopter deployment is documented in
[`docs/deployment.md`](../../docs/deployment.md). It does not create Foundry
resources.

The Bicep files in this directory are a separately maintained, optional
Foundry landing-zone sample. Review the source and its retained MIT license
before use. It is not a one-click extension of the root `azd` deployment and
has not been validated as a clean-room adopter workflow. Do not assume that a
local template compile or the owner's POC history proves it will deploy in
another tenant.

## Operator checklist

Before adapting this sample:

1. Select the target subscription, region, resource group, and Foundry project
   name for your own environment. Use local, ignored `azd` environment files
   for these values; never copy values from another tenant.
2. Review the Bicep resource graph, current quotas, model availability,
   network exposure, authentication configuration, role assignments, and
   estimated cost.
3. Keep Foundry local authentication disabled and use Entra authentication.
   Apply only the least-privilege roles required for the intended agent and
   API integration.
4. Treat any subscription budget as an alert, not a spending cap. Confirm
   cost and cleanup behavior before provisioning.
5. Run a reviewed `what-if` and obtain explicit owner approval before
   deploying or deleting resources.
6. Configure the API's `SkillLoom.User` role for the Foundry project identity
   only if the Foundry agent will call the API. Do not assign `SkillLoom.Admin`
   to an agent unless a separately reviewed use case requires it.

The existing Foundry integration has a narrow P4 proof-of-concept record in
the [implementation plan](../../docs/plans/implementation-plan.md). P5 hosted
execution remains disabled, and P6 hardening/pilot work is post-POC.
