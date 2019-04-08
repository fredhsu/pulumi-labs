import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup", {
    location: "WestUS2",
});


const testClientConfig = pulumi.output(azure.core.getClientConfig({}));
const primary = pulumi.output(azure.core.getSubscription({}));
// const testDefinition = new azure.role.Definition("test", {
//     assignableScopes: [resourceGroup.id],
//     permissions: [{
//         actions: ["*"],
//         notActions: [],
//     }],
//     scope: resourceGroup.id,
// });

const test = new azure.ad.Application("test", {
  availableToOtherTenants: false,
  homepage: "https://homepage",
  identifierUris: ["https://uri"],
  oauth2AllowImplicitFlow: true,
  replyUrls: ["https://replyurl"],
});

const testServicePrincipal = new azure.ad.ServicePrincipal("test", {
  applicationId: test.applicationId,
});

const testAssignment = new azure.role.Assignment("test", {
    principalId: testServicePrincipal.id,
    roleDefinitionName: "Contributor",
    scope: resourceGroup.id,
});

const testServicePrincipalPassword = new azure.ad.ServicePrincipalPassword("test", {});

// Export the connection string for the storage account
// export const sp = testServicePrincipal;
export const ta = testAssignment;
export const rg = resourceGroup;