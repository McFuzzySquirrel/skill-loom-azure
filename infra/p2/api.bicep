targetScope = 'resourceGroup'

@description('Name of the Container App for the API')
param containerAppName string = 'ca-slf-api-${uniqueString(subscription().id, resourceGroup().id)}'

@description('Resource ID of the approved legacy storage foundation Container Apps environment')
@minLength(1)
param environmentResourceId string

@description('Login server of the approved legacy storage foundation Azure Container Registry')
@minLength(1)
param registryServer string

@description('Resource ID of the legacy storage foundation user-assigned service identity')
@minLength(1)
param serviceIdentityResourceId string

@description('Client ID of the legacy storage foundation user-assigned service identity')
@minLength(1)
param serviceIdentityClientId string

@description('HTTPS Blob endpoint for the legacy storage foundation Storage account')
@minLength(1)
param blobEndpoint string

@description('Immutable container image reference, preferably pinned by digest')
@minLength(1)
param apiImage string

@description('Audience configured on the single-tenant Entra API registration')
@minLength(1)
param entraAudience string

@description('Entra access-token version validated by the service')
@allowed([
  '1.0'
  '2.0'
])
param entraTokenVersion string = '2.0'

@description('Tags applied to the API Container App')
param tags object = {
  project: 'skill-loom-foundry'
  environment: 'poc'
}

module api 'br/public:avm/res/app/container-app:0.23.1' = {
  name: 'api-${uniqueString(resourceGroup().id, containerAppName)}'
  params: {
    activeRevisionsMode: 'Single'
    containers: [
      {
        name: 'api'
        image: apiImage
        env: [
          {
            name: 'PORT'
            value: '3000'
          }
          {
            name: 'ENTRA_TENANT_ID'
            value: tenant().tenantId
          }
          {
            name: 'ENTRA_AUDIENCE'
            value: entraAudience
          }
          {
            name: 'ENTRA_TOKEN_VERSION'
            value: entraTokenVersion
          }
          {
            name: 'BLOB_ENDPOINT'
            value: blobEndpoint
          }
          {
            name: 'MANAGED_IDENTITY_CLIENT_ID'
            value: serviceIdentityClientId
          }
        ]
        resources: {
          cpu: json('0.5')
          memory: '1Gi'
        }
        probes: [
          {
            type: 'Startup'
            tcpSocket: {
              port: 3000
            }
            periodSeconds: 2
            timeoutSeconds: 2
            failureThreshold: 10
          }
          {
            type: 'Liveness'
            tcpSocket: {
              port: 3000
            }
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 2
          }
          {
            type: 'Readiness'
            tcpSocket: {
              port: 3000
            }
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 2
          }
        ]
      }
    ]
    enableTelemetry: false
    environmentResourceId: environmentResourceId
    ingressAllowInsecure: false
    ingressExternal: true
    ingressTargetPort: 3000
    ingressTransport: 'auto'
    managedIdentities: {
      userAssignedResourceIds: [
        serviceIdentityResourceId
      ]
    }
    name: containerAppName
    registries: [
      {
        server: registryServer
        identity: serviceIdentityResourceId
      }
    ]
    scaleSettings: {
      maxReplicas: 1
      minReplicas: 0
    }
    tags: tags
    workloadProfileName: 'Consumption'
  }
}

output containerAppName string = api.outputs.name
output apiFqdn string = api.outputs.fqdn
