targetScope = 'resourceGroup'

@description('Name of the azd environment used to distinguish resources.')
@minLength(1)
param environmentName string

@description('Azure region for the adopter environment.')
param location string = resourceGroup().location

@description('Audience of the single-tenant Entra API registration.')
@minLength(1)
param entraAudience string

@description('Access-token version configured on the Entra API registration.')
@allowed([
  '1.0'
  '2.0'
])
param entraTokenVersion string = '2.0'

var suffix = uniqueString(subscription().id, resourceGroup().id, environmentName)
var tags = {
  project: 'skill-loom-foundry'
  environment: environmentName
}
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-slf-${suffix}'
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource serviceIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-slf-${suffix}'
  location: location
  tags: tags
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'crslf${suffix}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource blobStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stslf${suffix}'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: blobStorage
  name: 'default'
  properties: {
    containerDeleteRetentionPolicy: {
      enabled: false
    }
    deleteRetentionPolicy: {
      enabled: false
    }
    isVersioningEnabled: false
  }
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'documents'
  properties: {
    publicAccess: 'None'
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-slf-${suffix}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

resource registryPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, serviceIdentity.id, acrPullRoleId)
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: serviceIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageDataAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(documentsContainer.id, serviceIdentity.id, storageBlobDataContributorRoleId)
  scope: documentsContainer
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: serviceIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-slf-api-${suffix}'
  location: location
  dependsOn: [
    registryPullAssignment
    storageDataAssignment
  ]
  tags: union(tags, {
    'azd-service-name': 'api'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${serviceIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 3000
        allowInsecure: false
        transport: 'auto'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: serviceIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${containerRegistry.properties.loginServer}/skill-loom-foundry/api:bootstrap'
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
              value: blobStorage.properties.primaryEndpoints.blob
            }
            {
              name: 'MANAGED_IDENTITY_CLIENT_ID'
              value: serviceIdentity.properties.clientId
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
      scale: {
        maxReplicas: 1
        minReplicas: 0
      }
    }
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = containerAppsEnvironment.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.id
output AZURE_CONTAINER_APP_NAME string = api.name
output AZURE_USER_ASSIGNED_IDENTITY_NAME string = serviceIdentity.name
output AZURE_USER_ASSIGNED_IDENTITY_RESOURCE_ID string = serviceIdentity.id
output AZURE_USER_ASSIGNED_IDENTITY_CLIENT_ID string = serviceIdentity.properties.clientId
output AZURE_STORAGE_ACCOUNT_NAME string = blobStorage.name
output AZURE_STORAGE_BLOB_ENDPOINT string = blobStorage.properties.primaryEndpoints.blob
output AZURE_DOCUMENTS_CONTAINER_NAME string = documentsContainer.name
