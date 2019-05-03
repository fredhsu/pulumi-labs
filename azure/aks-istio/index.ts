import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as k8s from "@pulumi/kubernetes";

let password = "arista123";
let nodeCount = 4;
let nodeSize = "Standard_D2_v2";

const config = new pulumi.Config();
const sshPublicKey = config.require("sshPublicKey");

// Create the AD service principal for the K8s cluster.
let adApp = new azure.ad.Application("aks");
let adSp = new azure.ad.ServicePrincipal("aksSp", { applicationId: adApp.applicationId });
let adSpPassword = new azure.ad.ServicePrincipalPassword("aksSpPassword", {
    servicePrincipalId: adSp.id,
    value: password,
    endDate: "2099-01-01T00:00:00Z",
});

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("fred-istio", {
    location: "WestUS2",
});
// Now allocate an AKS cluster.
export const k8sCluster = new azure.containerservice.KubernetesCluster("aksCluster", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    agentPoolProfile: {
        name: "aksagentpool",
        count: nodeCount,
        vmSize: nodeSize,
    },
    dnsPrefix: `${pulumi.getStack()}-kube`,
    linuxProfile: {
        adminUsername: "fredlhsu",
        sshKey: {
            keyData: sshPublicKey,
        },
    },
    servicePrincipal: {
        clientId: adApp.applicationId,
        clientSecret: adSpPassword.value,
    },
}); 

// Expose a K8s provider instance using our custom cluster instance.
export const k8sProvider = new k8s.Provider("aksK8s", {
    kubeconfig: k8sCluster.kubeConfigRaw,
});


